export interface Challenge {
  id: string;
  creatorId: string;
  creator: ChallengeUser;
  name: string;
  description: string;
  type: ChallengeType;
  category: ChallengeCategory;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  rules: ChallengeRule[];
  rewards: ChallengeReward[];
  participants: ChallengeParticipant[];
  maxParticipants?: number;
  isPublic: boolean;
  thumbnailUrl?: string;
  tags: string[];
  xpReward: number;
  createdAt: string;
  updatedAt: string;
}

export type ChallengeType =
  | "workouts_completed"
  | "calories_burned"
  | "duration"
  | "distance"
  | "weight_loss"
  | "streak"
  | "custom";

export type ChallengeCategory =
  | "fitness"
  | "nutrition"
  | "wellness"
  | "social"
  | "special";

export type ChallengeStatus =
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

export interface ChallengeRule {
  id: string;
  type: string;
  description: string;
  targetValue: number;
  unit: string;
}

export interface ChallengeReward {
  id: string;
  type: "xp" | "badge" | "title" | "points";
  value: number;
  position?: number;
  description: string;
}

export interface ChallengeParticipant {
  id: string;
  userId: string;
  user: ChallengeUser;
  joinedAt: string;
  progress: ChallengeProgress;
  status: ParticipantStatus;
  rank: number;
}

export type ParticipantStatus = "active" | "completed" | "disqualified" | "left";

export interface ChallengeProgress {
  currentValue: number;
  targetValue: number;
  percentage: number;
  lastUpdated: string;
  entries: ChallengeEntry[];
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  userId: string;
  value: number;
  unit: string;
  date: string;
  notes?: string;
  verified: boolean;
  createdAt: string;
}

export interface ChallengeUser {
  id: string;
  name: string;
  avatar?: string;
  level: number;
}

export interface Leaderboard {
  challengeId: string;
  entries: LeaderboardEntry[];
  lastUpdated: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: ChallengeUser;
  score: number;
  progress: number;
  trend: "up" | "down" | "same";
  completedAt?: string;
}

export interface ChallengeInvite {
  id: string;
  challengeId: string;
  challenge: Challenge;
  inviterId: string;
  inviteeId: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface ChallengeStats {
  totalChallenges: number;
  activeChallenges: number;
  completedChallenges: number;
  wonChallenges: number;
  totalXpEarned: number;
  averageRank: number;
  bestRank: number;
}

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  category: ChallengeCategory;
  duration: number;
  durationUnit: "days" | "weeks";
  rules: ChallengeRule[];
  rewards: ChallengeReward[];
  popularity: number;
}

export interface ChallengeFilters {
  type?: ChallengeType[];
  category?: ChallengeCategory[];
  status?: ChallengeStatus[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: "date" | "participants" | "end_date";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
