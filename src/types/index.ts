export * from "./workout";
export * from "./nutrition";
export * from "./progress";
export * from "./goal";
export * from "./challenge";
export * from "./social";
export * from "./api";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  height?: number;
  weight?: number;
  unit: "metric" | "imperial";
  timezone: string;
  locale: string;
  plan: string;
  level: number;
  xp: number;
  streak: number;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  units: UnitSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  workoutReminders: boolean;
  challengeUpdates: boolean;
  socialUpdates: boolean;
  achievements: boolean;
  weeklyReport: boolean;
}

export interface PrivacySettings {
  profileVisibility: "public" | "friends" | "private";
  activityVisibility: "public" | "friends" | "private";
  showWeight: boolean;
  showPhotos: boolean;
  allowSearch: boolean;
}

export interface UnitSettings {
  weight: "kg" | "lbs";
  distance: "km" | "mi";
  height: "cm" | "in";
  temperature: "celsius" | "fahrenheit";
}

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface WeeklySchedule {
  [key in DayOfWeek]: DaySchedule;
}

export interface DaySchedule {
  active: boolean;
  workoutType?: string;
  workoutTime?: string;
  reminderEnabled: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialStart?: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface FeatureUsage {
  id: string;
  userId: string;
  feature: string;
  usageCount: number;
  lastUsedAt: string;
  firstUsedAt: string;
}

export interface BetaFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedUsers: string[];
  createdAt: string;
  updatedAt: string;
}
