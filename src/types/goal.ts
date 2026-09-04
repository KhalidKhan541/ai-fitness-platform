export interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  status: GoalStatus;
  priority: GoalPriority;
  milestones: GoalMilestone[];
  progress: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GoalType =
  | "weight_loss"
  | "weight_gain"
  | "muscle_gain"
  | "strength"
  | "endurance"
  | "flexibility"
  | "habit"
  | "custom";

export type GoalStatus = "active" | "completed" | "paused" | "cancelled" | "expired";

export type GoalPriority = "low" | "medium" | "high";

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  badge: string;
  xp: number;
  requirement: AchievementRequirement;
  rarity: AchievementRarity;
  unlockedBy: number;
  createdAt: string;
}

export type AchievementCategory =
  | "workout"
  | "nutrition"
  | "progress"
  | "social"
  | "challenge"
  | "streak"
  | "special";

export type AchievementRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export interface AchievementRequirement {
  type: string;
  value: number;
  unit?: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  unlockedAt: string;
  seenAt?: string;
}

export interface UserStats {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  xpProgress: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  workoutStreak: number;
  longestWorkoutStreak: number;
  totalWorkouts: number;
  totalDuration: number;
  totalCaloriesBurned: number;
}

export interface Leaderboard {
  id: string;
  type: LeaderboardType;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  updatedAt: string;
}

export type LeaderboardType =
  | "xp"
  | "workouts"
  | "streak"
  | "challenges"
  | "points";

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all_time";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  value: number;
  unit: string;
  change: number;
  isCurrentUser: boolean;
}

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  type: GoalType;
  targetValue: number;
  unit: string;
  duration: number;
  durationUnit: "days" | "weeks" | "months";
  milestones: Array<{
    title: string;
    targetValue: number;
    order: number;
  }>;
  category: string;
  popularity: number;
}

export interface GoalFilters {
  type?: GoalType[];
  status?: GoalStatus[];
  priority?: GoalPriority[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: "date" | "progress" | "priority";
  sortOrder?: "asc" | "desc";
}
