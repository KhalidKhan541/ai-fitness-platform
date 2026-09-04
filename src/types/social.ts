export interface Post {
  id: string;
  userId: string;
  user: SocialUser;
  content: string;
  type: PostType;
  media: PostMedia[];
  workout?: PostWorkout;
  achievement?: PostAchievement;
  challenge?: PostChallenge;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type PostType =
  | "text"
  | "workout_share"
  | "achievement_share"
  | "challenge_share"
  | "progress_photo"
  | "milestone"
  | "tip"
  | "question";

export interface PostMedia {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: "image" | "video";
  width: number;
  height: number;
  duration?: number;
}

export interface PostWorkout {
  workoutId: string;
  name: string;
  type: string;
  duration: number;
  exercises: number;
  caloriesBurned: number;
}

export interface PostAchievement {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
}

export interface PostChallenge {
  challengeId: string;
  name: string;
  progress: number;
  rank: number;
}

export interface SocialUser {
  id: string;
  name: string;
  avatar: string;
  level: number;
  isFollowing: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: SocialUser;
  content: string;
  likes: number;
  isLiked: boolean;
  parentCommentId?: string;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Feed {
  posts: Post[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface FeedFilters {
  type?: PostType[];
  userId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: "recent" | "popular" | "relevant";
  page?: number;
  limit?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "challenge_invite"
  | "challenge_complete"
  | "achievement"
  | "goal_milestone"
  | "system"
  | "reminder";

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface SocialStats {
  followers: number;
  following: number;
  posts: number;
  totalLikes: number;
  totalComments: number;
}

export interface TrendingTag {
  tag: string;
  count: number;
  trend: "up" | "down" | "stable";
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: "post" | "comment" | "user";
  targetId: string;
  reason: ReportReason;
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: string;
}

export type ReportReason =
  | "spam"
  | "inappropriate"
  | "harassment"
  | "misinformation"
  | "other";

export interface SocialFilters {
  type?: NotificationType[];
  read?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
