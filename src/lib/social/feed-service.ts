import { z } from "zod";
import {
  format,
  parseISO,
  subDays,
  subHours,
  isAfter,
  isBefore,
  differenceInHours,
  differenceInMinutes,
  startOfDay,
  endOfDay,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum FeedItemType {
  WORKOUT_COMPLETED = "WORKOUT_COMPLETED",
  ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED",
  CHALLENGE_UPDATE = "CHALLENGE_UPDATE",
  GOAL_MILESTONE = "GOAL_MILESTONE",
  GOAL_COMPLETED = "GOAL_COMPLETED",
  POST_SHARED = "POST_SHARED",
  NEW_FOLLOWER = "NEW_FOLLOWER",
  STREAK_MILESTONE = "STREAK_MILESTONE",
  PERSONAL_RECORD = "PERSONAL_RECORD",
  PLAN_COMPLETED = "PLAN_COMPLETED",
}

export const FEED_ITEM_CONFIG: Record<
  FeedItemType,
  { label: string; icon: string; color: string; priority: number }
> = {
  [FeedItemType.WORKOUT_COMPLETED]: {
    label: "Workout Completed",
    icon: "🏋️",
    color: "#22c55e",
    priority: 10,
  },
  [FeedItemType.ACHIEVEMENT_UNLOCKED]: {
    label: "Achievement Unlocked",
    icon: "🏆",
    color: "#f59e0b",
    priority: 20,
  },
  [FeedItemType.CHALLENGE_UPDATE]: {
    label: "Challenge Update",
    icon: "🎯",
    color: "#3b82f6",
    priority: 15,
  },
  [FeedItemType.GOAL_MILESTONE]: {
    label: "Goal Milestone",
    icon: "⭐",
    color: "#a855f7",
    priority: 12,
  },
  [FeedItemType.GOAL_COMPLETED]: {
    label: "Goal Completed",
    icon: "✅",
    color: "#10b981",
    priority: 18,
  },
  [FeedItemType.POST_SHARED]: {
    label: "Post Shared",
    icon: "📝",
    color: "#6366f1",
    priority: 5,
  },
  [FeedItemType.NEW_FOLLOWER]: {
    label: "New Follower",
    icon: "👥",
    color: "#ec4899",
    priority: 3,
  },
  [FeedItemType.STREAK_MILESTONE]: {
    label: "Streak Milestone",
    icon: "🔥",
    color: "#f97316",
    priority: 16,
  },
  [FeedItemType.PERSONAL_RECORD]: {
    label: "Personal Record",
    icon: "🏅",
    color: "#eab308",
    priority: 22,
  },
  [FeedItemType.PLAN_COMPLETED]: {
    label: "Plan Completed",
    icon: "📋",
    color: "#14b8a6",
    priority: 17,
  },
};

// ─── Types ──────────────────────────────────────────────────────────

export interface FeedItem {
  id: string;
  userId: string;
  type: FeedItemType;
  title: string;
  description: string;
  icon: string;
  color: string;
  metadata: FeedItemMetadata;
  reactions: FeedReaction[];
  commentCount: number;
  isRead: boolean;
  createdAt: string;
  author: FeedAuthor | null;
}

export interface FeedAuthor {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedReaction {
  type: string;
  count: number;
  userReacted: boolean;
}

export type FeedItemMetadata =
  | WorkoutCompletedMetadata
  | AchievementUnlockedMetadata
  | ChallengeUpdateMetadata
  | GoalMilestoneMetadata
  | GoalCompletedMetadata
  | PostSharedMetadata
  | NewFollowerMetadata
  | StreakMilestoneMetadata
  | PersonalRecordMetadata
  | PlanCompletedMetadata;

export interface WorkoutCompletedMetadata {
  workoutType: string;
  duration: number;
  caloriesBurned: number;
  exercises: number;
  workoutId: string;
  isPersonalRecord: boolean;
}

export interface AchievementUnlockedMetadata {
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  rarity: string;
  points: number;
}

export interface ChallengeUpdateMetadata {
  challengeId: string;
  challengeName: string;
  rank: number;
  progress: number;
  targetValue: number;
  updateType: "joined" | "progress" | "completed" | "won";
}

export interface GoalMilestoneMetadata {
  goalId: string;
  goalTitle: string;
  milestoneTitle: string;
  currentValue: number;
  targetValue: number;
}

export interface GoalCompletedMetadata {
  goalId: string;
  goalTitle: string;
  goalType: string;
  finalValue: number;
  targetValue: number;
  duration: number;
}

export interface PostSharedMetadata {
  postId: string;
  postType: string;
  preview: string;
}

export interface NewFollowerMetadata {
  followerId: string;
  followerName: string;
  mutualFriends: number;
}

export interface StreakMilestoneMetadata {
  streakDays: number;
  milestoneType: "daily" | "weekly" | "monthly";
  message: string;
}

export interface PersonalRecordMetadata {
  exercise: string;
  previousRecord: number;
  newRecord: number;
  unit: string;
  improvement: number;
}

export interface PlanCompletedMetadata {
  planId: string;
  planName: string;
  totalWorkouts: number;
  duration: number;
  completionRate: number;
}

export interface FeedConfig {
  userId: string;
  page: number;
  pageSize: number;
  types?: FeedItemType[];
  friendsOnly: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface FeedPage {
  items: FeedItem[];
  nextPage: number | null;
  totalCount: number;
  hasMore: boolean;
}

// ─── Service ────────────────────────────────────────────────────────

export class FeedService {
  private feedItems: Map<string, FeedItem[]> = new Map();
  private userFeedIndex: Map<string, string[]> = new Map();
  private readStatus: Map<string, Set<string>> = new Map();

  async generateFeedItem(
    userId: string,
    type: FeedItemType,
    metadata: FeedItemMetadata,
    author?: FeedAuthor
  ): Promise<FeedItem> {
    const config = FEED_ITEM_CONFIG[type];
    const now = new Date().toISOString();

    const { title, description } = this.generateContent(type, metadata);

    const item: FeedItem = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      description,
      icon: config.icon,
      color: config.color,
      metadata,
      reactions: [],
      commentCount: 0,
      isRead: false,
      createdAt: now,
      author: author ?? null,
    };

    const userItems = this.feedItems.get(userId) ?? [];
    userItems.unshift(item);
    this.feedItems.set(userId, userItems);

    const feedIndex = this.userFeedIndex.get(userId) ?? [];
    feedIndex.unshift(item.id);
    this.userFeedIndex.set(userId, feedIndex);

    return item;
  }

  async getPersonalizedFeed(config: FeedConfig): Promise<FeedPage> {
    const { userId, page, pageSize, types, friendsOnly, dateRange } = config;

    let allItems = this.getAggregatedFeedItems(userId, friendsOnly);

    if (types && types.length > 0) {
      allItems = allItems.filter((item) => types.includes(item.type));
    }

    if (dateRange) {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      allItems = allItems.filter((item) => {
        const itemDate = parseISO(item.createdAt);
        return (
          (isAfter(itemDate, start) || itemDate.getTime() === start.getTime()) &&
          (isBefore(itemDate, end) || itemDate.getTime() === end.getTime())
        );
      });
    }

    allItems = this.rankFeedItems(allItems, userId);

    const totalCount = allItems.length;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const items = allItems.slice(startIndex, endIndex);

    const readSet = this.readStatus.get(userId) ?? new Set();
    for (const item of items) {
      item.isRead = readSet.has(item.id);
    }

    return {
      items,
      nextPage: endIndex < totalCount ? page + 1 : null,
      totalCount,
      hasMore: endIndex < totalCount,
    };
  }

  async getFeedItem(
    itemId: string,
    userId?: string
  ): Promise<FeedItem | null> {
    for (const [, items] of this.feedItems) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        if (userId) {
          const readSet = this.readStatus.get(userId) ?? new Set();
          item.isRead = readSet.has(item.id);
        }
        return item;
      }
    }
    return null;
  }

  async markAsRead(userId: string, itemId: string): Promise<boolean> {
    const readSet = this.readStatus.get(userId) ?? new Set();
    if (readSet.has(itemId)) return false;

    readSet.add(itemId);
    this.readStatus.set(userId, readSet);

    for (const [, items] of this.feedItems) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        item.isRead = true;
        break;
      }
    }

    return true;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const readSet = this.readStatus.get(userId) ?? new Set();
    let count = 0;

    for (const [, items] of this.feedItems) {
      for (const item of items) {
        if (!readSet.has(item.id)) {
          readSet.add(item.id);
          item.isRead = true;
          count++;
        }
      }
    }

    this.readStatus.set(userId, readSet);
    return count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const readSet = this.readStatus.get(userId) ?? new Set();
    const allItems = this.getAggregatedFeedItems(userId, false);
    return allItems.filter((item) => !readSet.has(item.id)).length;
  }

  async getUserActivityFeed(
    targetUserId: string,
    viewerId?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: FeedItem[]; total: number }> {
    const userItems = this.feedItems.get(targetUserId) ?? [];

    const filtered = userItems.filter(
      (item) =>
        item.type !== FeedItemType.NEW_FOLLOWER
    );

    const total = filtered.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return {
      items: filtered.slice(offset, offset + limit),
      total,
    };
  }

  async getWorkoutFeed(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: FeedItem[]; total: number }> {
    const allItems = this.getAggregatedFeedItems(userId, false);
    const workoutItems = allItems.filter(
      (item) => item.type === FeedItemType.WORKOUT_COMPLETED
    );

    const total = workoutItems.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return {
      items: workoutItems.slice(offset, offset + limit),
      total,
    };
  }

  async getAchievementFeed(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: FeedItem[]; total: number }> {
    const allItems = this.getAggregatedFeedItems(userId, false);
    const achievementItems = allItems.filter(
      (item) => item.type === FeedItemType.ACHIEVEMENT_UNLOCKED
    );

    const total = achievementItems.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return {
      items: achievementItems.slice(offset, offset + limit),
      total,
    };
  }

  async getChallengeFeed(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: FeedItem[]; total: number }> {
    const allItems = this.getAggregatedFeedItems(userId, false);
    const challengeItems = allItems.filter(
      (item) => item.type === FeedItemType.CHALLENGE_UPDATE
    );

    const total = challengeItems.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return {
      items: challengeItems.slice(offset, offset + limit),
      total,
    };
  }

  async addReaction(
    itemId: string,
    userId: string,
    reactionType: string
  ): Promise<boolean> {
    for (const [, items] of this.feedItems) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        const existing = item.reactions.find((r) => r.type === reactionType);
        if (existing) {
          if (existing.userReacted) {
            existing.count--;
            existing.userReacted = false;
            if (existing.count <= 0) {
              item.reactions = item.reactions.filter(
                (r) => r.type !== reactionType
              );
            }
            return false;
          }
          existing.count++;
          existing.userReacted = true;
          return true;
        }

        item.reactions.push({
          type: reactionType,
          count: 1,
          userReacted: true,
        });
        return true;
      }
    }
    return false;
  }

  async incrementCommentCount(itemId: string): Promise<boolean> {
    for (const [, items] of this.feedItems) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        item.commentCount++;
        return true;
      }
    }
    return false;
  }

  async deleteFeedItem(itemId: string, userId: string): Promise<boolean> {
    const userItems = this.feedItems.get(userId);
    if (!userItems) return false;

    const index = userItems.findIndex((i) => i.id === itemId);
    if (index === -1) return false;

    userItems.splice(index, 1);

    const feedIndex = this.userFeedIndex.get(userId) ?? [];
    const idxIndex = feedIndex.indexOf(itemId);
    if (idxIndex !== -1) feedIndex.splice(idxIndex, 1);

    return true;
  }

  async getFeedStats(userId: string): Promise<{
    totalItems: number;
    unreadCount: number;
    itemsByType: Record<FeedItemType, number>;
    todayItems: number;
    weekItems: number;
  }> {
    const allItems = this.getAggregatedFeedItems(userId, false);
    const readSet = this.readStatus.get(userId) ?? new Set();

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = subDays(now, 7);

    const itemsByType = Object.values(FeedItemType).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<FeedItemType, number>);

    let todayItems = 0;
    let weekItems = 0;

    for (const item of allItems) {
      itemsByType[item.type]++;

      const itemDate = parseISO(item.createdAt);
      if (isAfter(itemDate, todayStart) || itemDate.getTime() === todayStart.getTime()) {
        todayItems++;
      }
      if (isAfter(itemDate, weekStart)) {
        weekItems++;
      }
    }

    return {
      totalItems: allItems.length,
      unreadCount: allItems.filter((item) => !readSet.has(item.id)).length,
      itemsByType,
      todayItems,
      weekItems,
    };
  }

  private getAggregatedFeedItems(
    userId: string,
    friendsOnly: boolean
  ): FeedItem[] {
    const userItems = this.feedItems.get(userId) ?? [];

    if (!friendsOnly) return [...userItems];

    return userItems.filter((item) => item.author !== null || item.userId === userId);
  }

  private rankFeedItems(items: FeedItem[], userId: string): FeedItem[] {
    return [...items].sort((a, b) => {
      const scoreA = this.calculateFeedScore(a, userId);
      const scoreB = this.calculateFeedScore(b, userId);
      return scoreB - scoreA;
    });
  }

  private calculateFeedScore(item: FeedItem, userId: string): number {
    const config = FEED_ITEM_CONFIG[item.type];
    let score = config.priority;

    if (item.userId === userId) score += 5;

    const hoursAgo = differenceInHours(
      new Date(),
      parseISO(item.createdAt)
    );
    const recencyBoost = Math.max(0, 24 - hoursAgo) * 0.5;
    score += recencyBoost;

    const totalReactions = item.reactions.reduce(
      (sum, r) => sum + r.count,
      0
    );
    score += totalReactions * 0.3;
    score += item.commentCount * 0.5;

    if (
      item.type === FeedItemType.PERSONAL_RECORD ||
      item.type === FeedItemType.ACHIEVEMENT_UNLOCKED
    ) {
      score += 10;
    }

    return score;
  }

  private generateContent(
    type: FeedItemType,
    metadata: FeedItemMetadata
  ): { title: string; description: string } {
    switch (type) {
      case FeedItemType.WORKOUT_COMPLETED: {
        const m = metadata as WorkoutCompletedMetadata;
        return {
          title: `Completed a ${m.workoutType} workout`,
          description: `${m.duration} min · ${m.caloriesBurned} cal · ${m.exercises} exercises${m.isPersonalRecord ? " 🏆 New PR!" : ""}`,
        };
      }
      case FeedItemType.ACHIEVEMENT_UNLOCKED: {
        const m = metadata as AchievementUnlockedMetadata;
        return {
          title: `Unlocked "${m.achievementName}"`,
          description: `${m.rarity} achievement · +${m.points} points`,
        };
      }
      case FeedItemType.CHALLENGE_UPDATE: {
        const m = metadata as ChallengeUpdateMetadata;
        const action =
          m.updateType === "won"
            ? "Won"
            : m.updateType === "completed"
            ? "Completed"
            : m.updateType === "joined"
            ? "Joined"
            : "Updated progress on";
        return {
          title: `${action} "${m.challengeName}"`,
          description: `Rank #${m.rank} · ${m.progress}/${m.targetValue}`,
        };
      }
      case FeedItemType.GOAL_MILESTONE: {
        const m = metadata as GoalMilestoneMetadata;
        return {
          title: `Reached milestone: ${m.milestoneTitle}`,
          description: `${m.goalTitle} · ${m.currentValue}/${m.targetValue}`,
        };
      }
      case FeedItemType.GOAL_COMPLETED: {
        const m = metadata as GoalCompletedMetadata;
        return {
          title: `Completed goal: ${m.goalTitle}`,
          description: `${m.finalValue}/${m.targetValue} ${m.goalType} in ${m.duration} days`,
        };
      }
      case FeedItemType.POST_SHARED: {
        const m = metadata as PostSharedMetadata;
        return {
          title: "Shared a post",
          description: m.preview.slice(0, 100),
        };
      }
      case FeedItemType.NEW_FOLLOWER: {
        const m = metadata as NewFollowerMetadata;
        return {
          title: "New follower",
          description: `${m.followerName}${m.mutualFriends > 0 ? ` · ${m.mutualFriends} mutual friends` : ""}`,
        };
      }
      case FeedItemType.STREAK_MILESTONE: {
        const m = metadata as StreakMilestoneMetadata;
        return {
          title: `${m.streakDays}-day streak!`,
          description: m.message,
        };
      }
      case FeedItemType.PERSONAL_RECORD: {
        const m = metadata as PersonalRecordMetadata;
        return {
          title: `New PR: ${m.exercise}`,
          description: `${m.previousRecord} → ${m.newRecord} ${m.unit} (+${m.improvement})`,
        };
      }
      case FeedItemType.PLAN_COMPLETED: {
        const m = metadata as PlanCompletedMetadata;
        return {
          title: `Completed plan: ${m.planName}`,
          description: `${m.totalWorkouts} workouts · ${m.duration} days · ${m.completionRate}% complete`,
        };
      }
      default:
        return { title: "Update", description: "" };
    }
  }
}

export const feedService = new FeedService();
