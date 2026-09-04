import { z } from "zod";
import {
  format,
  parseISO,
  subDays,
  subHours,
  isAfter,
  isBefore,
  differenceInMinutes,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum PostType {
  WORKOUT_SUMMARY = "WORKOUT_SUMMARY",
  ACHIEVEMENT_UNLOCK = "ACHIEVEMENT_UNLOCK",
  MILESTONE = "MILESTONE",
  PROGRESS_UPDATE = "PROGRESS_UPDATE",
  TEXT = "TEXT",
  PHOTO = "PHOTO",
  CHALLENGE_UPDATE = "CHALLENGE_UPDATE",
  SHARE = "SHARE",
}

export enum FollowStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  BLOCKED = "BLOCKED",
}

export enum MessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  DELETED = "DELETED",
}

export enum ReactionType {
  LIKE = "LIKE",
  FIRE = "FIRE",
  MUSCLE = "MUSCLE",
  CLAP = "CLAP",
  HEART = "HEART",
  ROCKET = "ROCKET",
}

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  [ReactionType.LIKE]: "👍",
  [ReactionType.FIRE]: "🔥",
  [ReactionType.MUSCLE]: "💪",
  [ReactionType.CLAP]: "👏",
  [ReactionType.HEART]: "❤️",
  [ReactionType.ROCKET]: "🚀",
};

// ─── Validation Schemas ─────────────────────────────────────────────

export const createPostSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(PostType),
  content: z.string().max(2000).optional(),
  workoutId: z.string().uuid().optional(),
  achievementId: z.string().optional(),
  challengeId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).default("PUBLIC"),
  tags: z.array(z.string().max(30)).max(20).optional(),
});

export const createCommentSchema = z.object({
  userId: z.string().uuid(),
  postId: z.string().uuid(),
  content: z.string().min(1).max(1000),
  parentCommentId: z.string().uuid().optional(),
});

export const sendMessageSchema = z.object({
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  type: z.enum(["TEXT", "IMAGE", "WORKOUT_SHARE", "ACHIEVEMENT_SHARE"]).default("TEXT"),
  metadata: z.record(z.unknown()).optional(),
});

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(50),
  name: z.string().max(100).optional(),
  isGroup: z.boolean().default(false),
});

// ─── Types ──────────────────────────────────────────────────────────

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export interface Post {
  id: string;
  userId: string;
  type: PostType;
  content: string | null;
  workoutId: string | null;
  achievementId: string | null;
  challengeId: string | null;
  goalId: string | null;
  imageUrls: string[];
  metadata: Record<string, unknown>;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  tags: string[];
  reactions: Reaction[];
  reactionCounts: Record<ReactionType, number>;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  author: PostAuthor | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId: string | null;
  reactions: Reaction[];
  reactionCounts: Record<ReactionType, number>;
  replyCount: number;
  author: PostAuthor | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  id: string;
  userId: string;
  type: ReactionType;
  targetType: "POST" | "COMMENT";
  targetId: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: FollowStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  name: string | null;
  isGroup: boolean;
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "WORKOUT_SHARE" | "ACHIEVEMENT_SHARE";
  status: MessageStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface WorkoutShare {
  id: string;
  postId: string;
  workoutId: string;
  workoutType: string;
  duration: number;
  caloriesBurned: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    weight: number;
  }>;
  notes: string | null;
}

export interface SocialStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  mutualFollowers: number;
  profileViews: number;
}

// ─── Service ────────────────────────────────────────────────────────

export class SocialService {
  private posts: Map<string, Post> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private reactions: Map<string, Reaction[]> = new Map();
  private follows: Map<string, Follow[]> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private profileViews: Map<string, Map<string, string>> = new Map();

  async createPost(input: CreatePostInput): Promise<Post> {
    const validated = createPostSchema.parse(input);
    const now = new Date().toISOString();

    const post: Post = {
      id: crypto.randomUUID(),
      userId: validated.userId,
      type: validated.type,
      content: validated.content ?? null,
      workoutId: validated.workoutId ?? null,
      achievementId: validated.achievementId ?? null,
      challengeId: validated.challengeId ?? null,
      goalId: validated.goalId ?? null,
      imageUrls: validated.imageUrls ?? [],
      metadata: validated.metadata ?? {},
      visibility: validated.visibility,
      tags: validated.tags ?? [],
      reactions: [],
      reactionCounts: Object.values(ReactionType).reduce((acc, r) => {
        acc[r] = 0;
        return acc;
      }, {} as Record<ReactionType, number>),
      commentCount: 0,
      shareCount: 0,
      isLiked: false,
      author: null,
      createdAt: now,
      updatedAt: now,
    };

    this.posts.set(post.id, post);
    this.comments.set(post.id, []);
    this.reactions.set(post.id, []);

    return post;
  }

  async getPost(
    postId: string,
    viewerId?: string
  ): Promise<Post | null> {
    const post = this.posts.get(postId);
    if (!post) return null;

    return this.enrichPost(post, viewerId);
  }

  async updatePost(
    postId: string,
    userId: string,
    updates: { content?: string; visibility?: Post["visibility"]; tags?: string[] }
  ): Promise<Post | null> {
    const post = this.posts.get(postId);
    if (!post || post.userId !== userId) return null;

    if (updates.content !== undefined) post.content = updates.content;
    if (updates.visibility !== undefined) post.visibility = updates.visibility;
    if (updates.tags !== undefined) post.tags = updates.tags;
    post.updatedAt = new Date().toISOString();

    return this.enrichPost(post, userId);
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post || post.userId !== userId) return false;

    this.posts.delete(postId);
    this.comments.delete(postId);
    this.reactions.delete(postId);
    return true;
  }

  async getUserPosts(
    userId: string,
    viewerId?: string,
    options?: { limit?: number; offset?: number; type?: PostType }
  ): Promise<{ posts: Post[]; total: number }> {
    let userPosts = Array.from(this.posts.values()).filter(
      (p) => p.userId === userId
    );

    if (options?.type) {
      userPosts = userPosts.filter((p) => p.type === options.type);
    }

    const isOwnProfile = viewerId === userId;
    if (!isOwnProfile) {
      userPosts = userPosts.filter(
        (p) =>
          p.visibility === "PUBLIC" ||
          (p.visibility === "FRIENDS" && this.isFollowing(viewerId, userId))
      );
    }

    userPosts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = userPosts.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    const enriched = await Promise.all(
      userPosts.slice(offset, offset + limit).map((p) => this.enrichPost(p, viewerId))
    );

    return { posts: enriched, total };
  }

  async addReaction(
    userId: string,
    targetType: "POST" | "COMMENT",
    targetId: string,
    type: ReactionType
  ): Promise<boolean> {
    const reactionKey = targetType === "POST" ? targetId : targetId;
    const reactionsList = this.reactions.get(reactionKey) ?? [];

    const existing = reactionsList.find(
      (r) => r.userId === userId && r.targetType === targetType
    );
    if (existing) {
      if (existing.type === type) {
        reactionsList.splice(reactionsList.indexOf(existing), 1);
        if (targetType === "POST") {
          const post = this.posts.get(targetId);
          if (post) post.reactionCounts[type]--;
        }
        return false;
      }
      if (targetType === "POST") {
        const post = this.posts.get(targetId);
        if (post) post.reactionCounts[existing.type]--;
      }
      existing.type = type;
      if (targetType === "POST") {
        const post = this.posts.get(targetId);
        if (post) post.reactionCounts[type]++;
      }
      return true;
    }

    const reaction: Reaction = {
      id: crypto.randomUUID(),
      userId,
      type,
      targetType,
      targetId,
      createdAt: new Date().toISOString(),
    };

    reactionsList.push(reaction);
    this.reactions.set(reactionKey, reactionsList);

    if (targetType === "POST") {
      const post = this.posts.get(targetId);
      if (post) post.reactionCounts[type]++;
    }

    return true;
  }

  async removeReaction(
    userId: string,
    targetType: "POST" | "COMMENT",
    targetId: string
  ): Promise<boolean> {
    const reactionKey = targetType === "POST" ? targetId : targetId;
    const reactionsList = this.reactions.get(reactionKey) ?? [];
    const index = reactionsList.findIndex(
      (r) => r.userId === userId && r.targetType === targetType
    );
    if (index === -1) return false;

    const [removed] = reactionsList.splice(index, 1);
    if (targetType === "POST") {
      const post = this.posts.get(targetId);
      if (post) post.reactionCounts[removed.type]--;
    }
    return true;
  }

  async addComment(input: CreateCommentInput): Promise<Comment> {
    const validated = createCommentSchema.parse(input);
    const now = new Date().toISOString();

    const comment: Comment = {
      id: crypto.randomUUID(),
      postId: validated.postId,
      userId: validated.userId,
      content: validated.content,
      parentCommentId: validated.parentCommentId ?? null,
      reactions: [],
      reactionCounts: Object.values(ReactionType).reduce((acc, r) => {
        acc[r] = 0;
        return acc;
      }, {} as Record<ReactionType, number>),
      replyCount: 0,
      author: null,
      createdAt: now,
      updatedAt: now,
    };

    const postComments = this.comments.get(validated.postId) ?? [];
    postComments.push(comment);
    this.comments.set(validated.postId, postComments);

    const post = this.posts.get(validated.postId);
    if (post) post.commentCount++;

    this.reactions.set(comment.id, []);

    return comment;
  }

  async getPostComments(
    postId: string,
    options?: {
      limit?: number;
      offset?: number;
      parentOnly?: boolean;
      viewerId?: string;
    }
  ): Promise<{ comments: Comment[]; total: number }> {
    const postComments = this.comments.get(postId) ?? [];

    let filtered = postComments;
    if (options?.parentOnly !== false) {
      filtered = postComments.filter((c) => c.parentCommentId === null);
    }

    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = filtered.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return { comments: filtered.slice(offset, offset + limit), total };
  }

  async getCommentReplies(
    commentId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Comment[]> {
    for (const [, postComments] of this.comments) {
      const replies = postComments
        .filter((c) => c.parentCommentId === commentId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? 20;
      return replies.slice(offset, offset + limit);
    }
    return [];
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    for (const [postId, postComments] of this.comments) {
      const index = postComments.findIndex(
        (c) => c.id === commentId && c.userId === userId
      );
      if (index !== -1) {
        postComments.splice(index, 1);
        const post = this.posts.get(postId);
        if (post && post.commentCount > 0) post.commentCount--;
        return true;
      }
    }
    return false;
  }

  async followUser(
    followerId: string,
    followingId: string
  ): Promise<Follow> {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existingFollows = this.follows.get(followerId) ?? [];
    const existing = existingFollows.find(
      (f) => f.followingId === followingId
    );

    if (existing) {
      if (existing.status === FollowStatus.BLOCKED) {
        throw new Error("Cannot follow this user");
      }
      return existing;
    }

    const now = new Date().toISOString();
    const follow: Follow = {
      id: crypto.randomUUID(),
      followerId,
      followingId,
      status: FollowStatus.ACCEPTED,
      createdAt: now,
    };

    existingFollows.push(follow);
    this.follows.set(followerId, existingFollows);

    return follow;
  }

  async unfollowUser(
    followerId: string,
    followingId: string
  ): Promise<boolean> {
    const follows = this.follows.get(followerId) ?? [];
    const index = follows.findIndex((f) => f.followingId === followingId);
    if (index === -1) return false;

    follows.splice(index, 1);
    return true;
  }

  async getFollowers(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ users: Follow[]; total: number }> {
    const allFollows = Array.from(this.follows.values()).flat();
    const followers = allFollows.filter(
      (f) =>
        f.followingId === userId && f.status === FollowStatus.ACCEPTED
    );

    const total = followers.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return { users: followers.slice(offset, offset + limit), total };
  }

  async getFollowing(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ users: Follow[]; total: number }> {
    const follows = (this.follows.get(userId) ?? []).filter(
      (f) => f.status === FollowStatus.ACCEPTED
    );

    const total = follows.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return { users: follows.slice(offset, offset + limit), total };
  }

  async getMutualFollowers(
    userId: string
  ): Promise<string[]> {
    const following = new Set(
      (this.follows.get(userId) ?? [])
        .filter((f) => f.status === FollowStatus.ACCEPTED)
        .map((f) => f.followingId)
    );

    const followers = new Set(
      Array.from(this.follows.values())
        .flat()
        .filter(
          (f) =>
            f.followingId === userId && f.status === FollowStatus.ACCEPTED
        )
        .map((f) => f.followerId)
    );

    return Array.from(following).filter((id) => followers.has(id));
  }

  async isFollowing(
    followerId: string | undefined,
    followingId: string
  ): Promise<boolean> {
    if (!followerId) return false;
    const follows = this.follows.get(followerId) ?? [];
    return follows.some(
      (f) =>
        f.followingId === followingId && f.status === FollowStatus.ACCEPTED
    );
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const validated = sendMessageSchema.parse(input);

    if (validated.senderId === validated.receiverId) {
      throw new Error("Cannot send message to yourself");
    }

    const conversation = this.findOrCreateConversation(
      validated.senderId,
      validated.receiverId
    );

    const now = new Date().toISOString();
    const message: Message = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      senderId: validated.senderId,
      content: validated.content,
      type: validated.type,
      status: MessageStatus.SENT,
      metadata: validated.metadata ?? {},
      createdAt: now,
      readAt: null,
    };

    const messages = this.messages.get(conversation.id) ?? [];
    messages.push(message);
    this.messages.set(conversation.id, messages);

    conversation.lastMessage = message;
    conversation.updatedAt = now;

    return message;
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ messages: Message[]; total: number }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return { messages: [], total: 0 };
    if (!conversation.participantIds.includes(userId)) {
      return { messages: [], total: 0 };
    }

    const messages = (this.messages.get(conversationId) ?? []).filter(
      (m) => m.status !== MessageStatus.DELETED
    );

    messages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = messages.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return { messages: messages.slice(offset, offset + limit), total };
  }

  async markMessagesRead(
    conversationId: string,
    userId: string
  ): Promise<number> {
    const messages = this.messages.get(conversationId) ?? [];
    let count = 0;

    for (const message of messages) {
      if (
        message.senderId !== userId &&
        message.status !== MessageStatus.READ
      ) {
        message.status = MessageStatus.READ;
        message.readAt = new Date().toISOString();
        count++;
      }
    }

    return count;
  }

  async getUserConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const userConversations = Array.from(this.conversations.values())
      .filter((c) => c.participantIds.includes(userId))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      );

    const total = userConversations.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return {
      conversations: userConversations.slice(offset, offset + limit),
      total,
    };
  }

  async getSocialStats(userId: string): Promise<SocialStats> {
    const followers = (
      await this.getFollowers(userId, { limit: Number.MAX_SAFE_INTEGER })
    ).total;
    const following = (
      await this.getFollowing(userId, { limit: Number.MAX_SAFE_INTEGER })
    ).total;
    const mutual = (await this.getMutualFollowers(userId)).length;

    const userPosts = Array.from(this.posts.values()).filter(
      (p) => p.userId === userId
    );
    const postsCount = userPosts.length;

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    for (const post of userPosts) {
      totalLikes += Object.values(post.reactionCounts).reduce(
        (a, b) => a + b,
        0
      );
      totalComments += post.commentCount;
      totalShares += post.shareCount;
    }

    const profileViewsMap = this.profileViews.get(userId);
    const profileViews = profileViewsMap?.size ?? 0;

    return {
      followersCount: followers,
      followingCount: following,
      postsCount,
      totalLikes,
      totalComments,
      totalShares,
      mutualFollowers: mutual,
      profileViews,
    };
  }

  async recordProfileView(
    viewerId: string,
    profileUserId: string
  ): Promise<void> {
    if (viewerId === profileUserId) return;

    const views = this.profileViews.get(profileUserId) ?? new Map();
    views.set(viewerId, new Date().toISOString());
    this.profileViews.set(profileUserId, views);
  }

  async searchUsers(
    query: string,
    options?: { limit?: number; offset?: number; viewerId?: string }
  ): Promise<
    Array<{
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      isFollowing: boolean;
      followersCount: number;
    }>
  > {
    const lowerQuery = query.toLowerCase();
    const results: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      isFollowing: boolean;
      followersCount: number;
    }> = [];

    for (const post of this.posts.values()) {
      if (post.author) {
        const matches =
          post.author.username.toLowerCase().includes(lowerQuery) ||
          post.author.displayName.toLowerCase().includes(lowerQuery);

        if (matches && !results.find((r) => r.userId === post.author!.userId)) {
          results.push({
            userId: post.author.userId,
            username: post.author.username,
            displayName: post.author.displayName,
            avatarUrl: post.author.avatarUrl,
            isFollowing: post.author.isFollowing,
            followersCount: 0,
          });
        }
      }
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;
    return results.slice(offset, offset + limit);
  }

  async getExploreFeed(
    viewerId: string,
    options?: { limit?: number; offset?: number; type?: PostType }
  ): Promise<Post[]> {
    let posts = Array.from(this.posts.values()).filter(
      (p) => p.visibility === "PUBLIC"
    );

    if (options?.type) {
      posts = posts.filter((p) => p.type === options.type);
    }

    const now = new Date();
    posts = posts.filter((p) => {
      const postDate = parseISO(p.createdAt);
      return differenceInMinutes(now, postDate) < 60 * 24 * 30;
    });

    posts.sort((a, b) => {
      const aScore = this.calculatePostScore(a);
      const bScore = this.calculatePostScore(b);
      return bScore - aScore;
    });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    const enriched = await Promise.all(
      posts.slice(offset, offset + limit).map((p) => this.enrichPost(p, viewerId))
    );

    return enriched;
  }

  private calculatePostScore(post: Post): number {
    const totalReactions = Object.values(post.reactionCounts).reduce(
      (a, b) => a + b,
      0
    );
    const engagementScore =
      totalReactions * 1 + post.commentCount * 2 + post.shareCount * 3;

    const postAge = differenceInMinutes(new Date(), parseISO(post.createdAt));
    const recencyScore = Math.max(0, 100 - postAge / 60);

    return engagementScore * 0.7 + recencyScore * 0.3;
  }

  private findOrCreateConversation(
    userId1: string,
    userId2: string
  ): Conversation {
    for (const conv of this.conversations.values()) {
      if (
        !conv.isGroup &&
        conv.participantIds.length === 2 &&
        conv.participantIds.includes(userId1) &&
        conv.participantIds.includes(userId2)
      ) {
        return conv;
      }
    }

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      participantIds: [userId1, userId2],
      name: null,
      isGroup: false,
      lastMessage: null,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);

    return conversation;
  }

  private async enrichPost(
    post: Post,
    viewerId?: string
  ): Promise<Post> {
    const reactions = this.reactions.get(post.id) ?? [];
    const isLiked = viewerId
      ? reactions.some(
          (r) => r.userId === viewerId && r.targetType === "POST"
        )
      : false;

    return {
      ...post,
      reactions,
      isLiked,
      author: post.author ?? {
        userId: post.userId,
        username: `user_${post.userId.slice(0, 8)}`,
        displayName: `User ${post.userId.slice(0, 8)}`,
        avatarUrl: null,
        isFollowing: viewerId
          ? await this.isFollowing(viewerId, post.userId)
          : false,
      },
    };
  }
}

export const socialService = new SocialService();
