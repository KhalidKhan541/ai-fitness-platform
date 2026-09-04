import { Role } from "@prisma/client";

// ─── Permission Definitions ───────────────────────────

export type Permission =
  | "user:read"
  | "user:write"
  | "user:delete"
  | "user:admin"
  | "workout:read"
  | "workout:write"
  | "workout:delete"
  | "workout:share"
  | "workout:admin"
  | "nutrition:read"
  | "nutrition:write"
  | "nutrition:delete"
  | "nutrition:admin"
  | "measurement:read"
  | "measurement:write"
  | "measurement:delete"
  | "goal:read"
  | "goal:write"
  | "goal:delete"
  | "plan:read"
  | "plan:write"
  | "plan:delete"
  | "plan:admin"
  | "challenge:read"
  | "challenge:write"
  | "challenge:delete"
  | "challenge:admin"
  | "social:read"
  | "social:write"
  | "social:delete"
  | "social:admin"
  | "device:read"
  | "device:write"
  | "device:delete"
  | "notification:read"
  | "notification:write"
  | "notification:admin"
  | "subscription:read"
  | "subscription:write"
  | "subscription:admin"
  | "ai:read"
  | "ai:write"
  | "analytics:read"
  | "analytics:admin"
  | "admin:users"
  | "admin:content"
  | "admin:settings"
  | "admin:billing"
  | "coach:athletes"
  | "coach:plans"
  | "coach:analytics"
  | "report:create"
  | "report:resolve";

// ─── Role Permissions Map ─────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  USER: [
    "user:read",
    "user:write",
    "workout:read",
    "workout:write",
    "workout:delete",
    "workout:share",
    "nutrition:read",
    "nutrition:write",
    "nutrition:delete",
    "measurement:read",
    "measurement:write",
    "measurement:delete",
    "goal:read",
    "goal:write",
    "goal:delete",
    "plan:read",
    "plan:write",
    "plan:delete",
    "challenge:read",
    "challenge:write",
    "social:read",
    "social:write",
    "social:delete",
    "device:read",
    "device:write",
    "device:delete",
    "notification:read",
    "notification:write",
    "subscription:read",
    "ai:read",
    "ai:write",
    "analytics:read",
    "report:create",
  ],
  COACH: [
    "user:read",
    "user:write",
    "workout:read",
    "workout:write",
    "workout:delete",
    "workout:share",
    "workout:admin",
    "nutrition:read",
    "nutrition:write",
    "nutrition:delete",
    "measurement:read",
    "measurement:write",
    "measurement:delete",
    "goal:read",
    "goal:write",
    "goal:delete",
    "plan:read",
    "plan:write",
    "plan:delete",
    "plan:admin",
    "challenge:read",
    "challenge:write",
    "challenge:delete",
    "challenge:admin",
    "social:read",
    "social:write",
    "social:delete",
    "social:admin",
    "device:read",
    "device:write",
    "device:delete",
    "notification:read",
    "notification:write",
    "notification:admin",
    "subscription:read",
    "subscription:write",
    "ai:read",
    "ai:write",
    "analytics:read",
    "analytics:admin",
    "coach:athletes",
    "coach:plans",
    "coach:analytics",
    "report:create",
    "report:resolve",
  ],
  ADMIN: [
    "user:read",
    "user:write",
    "user:delete",
    "user:admin",
    "workout:read",
    "workout:write",
    "workout:delete",
    "workout:share",
    "workout:admin",
    "nutrition:read",
    "nutrition:write",
    "nutrition:delete",
    "nutrition:admin",
    "measurement:read",
    "measurement:write",
    "measurement:delete",
    "goal:read",
    "goal:write",
    "goal:delete",
    "plan:read",
    "plan:write",
    "plan:delete",
    "plan:admin",
    "challenge:read",
    "challenge:write",
    "challenge:delete",
    "challenge:admin",
    "social:read",
    "social:write",
    "social:delete",
    "social:admin",
    "device:read",
    "device:write",
    "device:delete",
    "notification:read",
    "notification:write",
    "notification:admin",
    "subscription:read",
    "subscription:write",
    "subscription:admin",
    "ai:read",
    "ai:write",
    "analytics:read",
    "analytics:admin",
    "admin:users",
    "admin:content",
    "admin:settings",
    "admin:billing",
    "coach:athletes",
    "coach:plans",
    "coach:analytics",
    "report:create",
    "report:resolve",
  ],
};

// ─── Permission Helpers ───────────────────────────────

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const userPermissions = getPermissionsForRole(role);
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const userPermissions = getPermissionsForRole(role);
  return permissions.every((p) => userPermissions.includes(p));
}

// ─── Data Privacy ─────────────────────────────────────

export interface DataAccessContext {
  requesterId: string;
  requesterRole: Role;
  ownerId: string;
  isPublic: boolean;
  isFollower?: boolean;
  isCoach?: boolean;
}

/**
 * Check if a user can view another user's data.
 */
export function canViewData(context: DataAccessContext): boolean {
  // Owner can always view their own data
  if (context.requesterId === context.ownerId) {
    return true;
  }

  // Admin can view anything
  if (context.requesterRole === "ADMIN") {
    return true;
  }

  // Public data is viewable by anyone
  if (context.isPublic) {
    return true;
  }

  // Coach can view their athletes' data (if the relationship exists)
  if (context.requesterRole === "COACH" && context.isCoach) {
    return true;
  }

  // Followers can view follower-only content
  if (context.isFollower) {
    return true;
  }

  return false;
}

/**
 * Check if a user can modify another user's data.
 */
export function canModifyData(context: DataAccessContext): boolean {
  // Only the owner can modify their own data
  if (context.requesterId === context.ownerId) {
    return true;
  }

  // Admin can modify anything
  if (context.requesterRole === "ADMIN") {
    return true;
  }

  // Coach can modify their athletes' data
  if (context.requesterRole === "COACH" && context.isCoach) {
    return true;
  }

  return false;
}

/**
 * Check if a user can delete another user's data.
 */
export function canDeleteData(context: DataAccessContext): boolean {
  // Only the owner can delete their own data
  if (context.requesterId === context.ownerId) {
    return true;
  }

  // Admin can delete anything
  if (context.requesterRole === "ADMIN") {
    return true;
  }

  return false;
}

// ─── Workout Privacy ──────────────────────────────────

export interface WorkoutAccessContext {
  requesterId: string;
  requesterRole: Role;
  workoutOwnerId: string;
  isWorkoutPublic: boolean;
  isCoach?: boolean;
}

/**
 * Check if a user can view a workout.
 */
export function canViewWorkout(context: WorkoutAccessContext): boolean {
  if (context.requesterId === context.workoutOwnerId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  if (context.isWorkoutPublic) {
    return true;
  }
  if (context.requesterRole === "COACH" && context.isCoach) {
    return true;
  }
  return false;
}

/**
 * Check if a user can modify a workout.
 */
export function canModifyWorkout(context: WorkoutAccessContext): boolean {
  if (context.requesterId === context.workoutOwnerId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  if (context.requesterRole === "COACH" && context.isCoach) {
    return true;
  }
  return false;
}

// ─── Nutrition Privacy ────────────────────────────────

export interface NutritionAccessContext {
  requesterId: string;
  requesterRole: Role;
  nutritionOwnerId: string;
  isPublic?: boolean;
}

/**
 * Check if a user can view nutrition data.
 */
export function canViewNutrition(context: NutritionAccessContext): boolean {
  if (context.requesterId === context.nutritionOwnerId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  if (context.isPublic) {
    return true;
  }
  return false;
}

// ─── Goal Privacy ─────────────────────────────────────

export interface GoalAccessContext {
  requesterId: string;
  requesterRole: Role;
  goalOwnerId: string;
  isGoalPublic: boolean;
}

/**
 * Check if a user can view a goal.
 */
export function canViewGoal(context: GoalAccessContext): boolean {
  if (context.requesterId === context.goalOwnerId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  if (context.isGoalPublic) {
    return true;
  }
  return false;
}

// ─── Social Privacy ───────────────────────────────────

export interface SocialAccessContext {
  requesterId: string;
  requesterRole: Role;
  postOwnerId: string;
  postVisibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  isFollower?: boolean;
}

/**
 * Check if a user can view a social post.
 */
export function canViewPost(context: SocialAccessContext): boolean {
  if (context.requesterId === context.postOwnerId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  if (context.postVisibility === "PUBLIC") {
    return true;
  }
  if (context.postVisibility === "FOLLOWERS" && context.isFollower) {
    return true;
  }
  return false;
}

/**
 * Check if a user can modify a social post.
 */
export function canModifyPost(context: SocialAccessContext): boolean {
  if (context.requesterId === context.postOwnerId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  return false;
}

// ─── Challenge Privacy ────────────────────────────────

export interface ChallengeAccessContext {
  requesterId: string;
  requesterRole: Role;
  challengeCreatorId: string;
  isChallengePublic: boolean;
  isParticipant?: boolean;
}

/**
 * Check if a user can view a challenge.
 */
export function canViewChallenge(context: ChallengeAccessContext): boolean {
  if (context.requesterId === context.challengeCreatorId) {
    return true;
  }
  if (context.requesterRole === "ADMIN") {
    return true;
  }
  if (context.isChallengePublic) {
    return true;
  }
  if (context.isParticipant) {
    return true;
  }
  return false;
}

// ─── Subscription Features ────────────────────────────

const TIER_FEATURES: Record<string, Record<string, boolean>> = {
  FREE: {
    basicWorkouts: true,
    basicNutrition: true,
    basicGoals: true,
    advancedAnalytics: false,
    aiTrainer: false,
    customPlans: false,
    coachMode: false,
    prioritySupport: false,
    exportData: false,
    apiAccess: false,
  },
  PRO: {
    basicWorkouts: true,
    basicNutrition: true,
    basicGoals: true,
    advancedAnalytics: true,
    aiTrainer: true,
    customPlans: true,
    coachMode: false,
    prioritySupport: false,
    exportData: true,
    apiAccess: false,
  },
  COACH: {
    basicWorkouts: true,
    basicNutrition: true,
    basicGoals: true,
    advancedAnalytics: true,
    aiTrainer: true,
    customPlans: true,
    coachMode: true,
    prioritySupport: true,
    exportData: true,
    apiAccess: true,
  },
  ENTERPRISE: {
    basicWorkouts: true,
    basicNutrition: true,
    basicGoals: true,
    advancedAnalytics: true,
    aiTrainer: true,
    customPlans: true,
    coachMode: true,
    prioritySupport: true,
    exportData: true,
    apiAccess: true,
  },
};

/**
 * Check if a subscription tier has a specific feature.
 */
export function hasFeature(tier: string, feature: string): boolean {
  return TIER_FEATURES[tier]?.[feature] ?? false;
}

/**
 * Get all features for a subscription tier.
 */
export function getFeatures(tier: string): Record<string, boolean> {
  return TIER_FEATURES[tier] ?? TIER_FEATURES.FREE;
}

/**
 * Check if a user has premium features.
 */
export function isPremiumUser(isPremium: boolean, role: Role): boolean {
  return isPremium || role === "COACH" || role === "ADMIN";
}

// ─── Rate Limiting ────────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "ai:chat": { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20/hour
  "ai:workout": { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
  "workout:create": { maxRequests: 50, windowMs: 24 * 60 * 60 * 1000 }, // 50/day
  "social:post": { maxRequests: 20, windowMs: 24 * 60 * 60 * 1000 }, // 20/day
  "social:comment": { maxRequests: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100/day
  "nutrition:log": { maxRequests: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100/day
  "measurement:log": { maxRequests: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10/day
  "device:sync": { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour
};

/**
 * Get rate limit for a specific action and user tier.
 */
export function getRateLimit(action: string, tier: string): RateLimitConfig {
  const base = RATE_LIMITS[action] ?? { maxRequests: 100, windowMs: 60 * 60 * 1000 };

  // Premium users get 2x limits
  if (tier === "PRO" || tier === "COACH" || tier === "ADMIN") {
    return {
      maxRequests: base.maxRequests * 2,
      windowMs: base.windowMs,
    };
  }

  return base;
}

// ─── Content Moderation ───────────────────────────────

export interface ModerationContext {
  userId: string;
  role: Role;
  contentType: "post" | "comment" | "workout" | "plan";
  contentId: string;
  contentOwnerId: string;
}

/**
 * Check if a user can moderate content.
 */
export function canModerateContent(context: ModerationContext): boolean {
  // Owner can moderate their own content
  if (context.userId === context.contentOwnerId) {
    return true;
  }

  // Admin can moderate anything
  if (context.role === "ADMIN") {
    return true;
  }

  // Coach can moderate their athletes' content
  if (context.role === "COACH") {
    return true;
  }

  return false;
}

/**
 * Check if a user can ban another user.
 */
export function canBanUser(requesterRole: Role, targetRole: Role): boolean {
  if (requesterRole === "ADMIN") {
    return true;
  }
  if (requesterRole === "COACH" && targetRole === "USER") {
    return true;
  }
  return false;
}

// ─── Export all helpers ───────────────────────────────

export const permissions = {
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canViewData,
  canModifyData,
  canDeleteData,
  canViewWorkout,
  canModifyWorkout,
  canViewNutrition,
  canViewGoal,
  canViewPost,
  canModifyPost,
  canViewChallenge,
  hasFeature,
  getFeatures,
  isPremiumUser,
  getRateLimit,
  canModerateContent,
  canBanUser,
} as const;
