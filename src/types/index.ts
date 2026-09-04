// ─── Prisma Enums ─────────────────────────────────────

export type Role = "USER" | "COACH" | "ADMIN";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type FitnessGoal =
  | "LOSE_WEIGHT"
  | "GAIN_MUSCLE"
  | "MAINTAIN"
  | "IMPROVE_ENDURANCE"
  | "INCREASE_STRENGTH"
  | "IMPROVE_FLEXIBILITY"
  | "GENERAL_FITNESS"
  | "SPORT_SPECIFIC"
  | "REHABILITATION";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE"
  | "EXTREMELY_ACTIVE";

export type WorkoutType =
  | "STRENGTH"
  | "CARDIO"
  | "FLEXIBILITY"
  | "HIIT"
  | "CROSSFIT"
  | "YOGA"
  | "PILATES"
  | "SWIMMING"
  | "CYCLING"
  | "RUNNING"
  | "WALKING"
  | "SPORTS"
  | "CUSTOM"
  | "REST_DAY";

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "ABS"
  | "OBLIQUES"
  | "QUADRICEPS"
  | "HAMSTRINGS"
  | "CALVES"
  | "GLUTES"
  | "TRAPS"
  | "LATS"
  | "FULL_BODY"
  | "OTHER";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ELITE";

export type ExerciseType =
  | "COMPOUND"
  | "ISOLATION"
  | "CARDIO"
  | "BODYWEIGHT"
  | "MACHINE"
  | "FREE_WEIGHT"
  | "CABLE"
  | "RESISTANCE_BAND"
  | "PLYOMETRIC";

export type MealType =
  | "BREAKFAST"
  | "LUNCH"
  | "DINNER"
  | "SNACK"
  | "PRE_WORKOUT"
  | "POST_WORKOUT"
  | "BEFORE_BED";

export type GoalType =
  | "WEIGHT"
  | "BODY_FAT"
  | "MUSCLE_MASS"
  | "STRENGTH"
  | "ENDURANCE"
  | "CONSISTENCY"
  | "CALORIE"
  | "WATER"
  | "SLEEP"
  | "CUSTOM";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "FAILED" | "ARCHIVED";

export type ChallengeStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type ChallengeType =
  | "WORKOUT_COUNT"
  | "TOTAL_VOLUME"
  | "CALORIES_BURNED"
  | "STREAK"
  | "BODY_MEASUREMENT"
  | "WEIGHT_LOSS"
  | "CUSTOM";

export type NotificationType =
  | "WORKOUT_REMINDER"
  | "GOAL_MILESTONE"
  | "CHALLENGE_UPDATE"
  | "SOCIAL_INTERACTION"
  | "ACHIEVEMENT_UNLOCKED"
  | "PLAN_UPDATE"
  | "SUBSCRIPTION"
  | "SYSTEM";

export type SubscriptionTier = "FREE" | "PRO" | "COACH" | "ENTERPRISE";

export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "TRIALING"
  | "PAUSED";

export type DeviceType =
  | "FITBIT"
  | "APPLE_WATCH"
  | "GARMIN"
  | "OURA_RING"
  | "WHOOP"
  | "SAMSUNG_GALAXY_WATCH"
  | "GOOGLE_FIT"
  | "STRAVA"
  | "MYFITNESSPAL"
  | "OTHER";

export type PostVisibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export type ReportReason = "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "MISINFORMATION" | "OTHER";

// ─── Auth Types ───────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  username: string | null;
  isPremium: boolean;
}

export interface Session {
  user: AuthUser;
  expires: string;
}

export interface JWTToken {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  username: string | null;
  isPremium: boolean;
  iat: number;
  exp: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
}

// ─── User & Profile ───────────────────────────────────

export interface User {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  username: string | null;
  image: string | null;
  role: Role;
  isPremium: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  fitnessGoal: FitnessGoal;
  activityLevel: ActivityLevel;
  bodyFatPercent: number | null;
  restingHr: number | null;
  maxHr: number | null;
  bio: string | null;
  location: string | null;
  timezone: string;
  units: string;
  profileImage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithProfile extends User {
  profile: Profile | null;
}

export interface UserPublicProfile {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  fitnessGoal: FitnessGoal;
  createdAt: Date;
}

// ─── Workout ──────────────────────────────────────────

export interface Workout {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: WorkoutType;
  difficulty: Difficulty;
  durationMin: number | null;
  caloriesBurned: number | null;
  isPublic: boolean;
  rating: number | null;
  notes: string | null;
  completedAt: Date | null;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExercise[];
  user: Pick<User, "id" | "name" | "username" | "image">;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  restSec: number | null;
  notes: string | null;
  supersetId: string | null;
  createdAt: Date;
  updatedAt: Date;
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isDropSet: boolean;
  isFailure: boolean;
  restAfterSec: number | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutLog {
  id: string;
  workoutId: string;
  userId: string;
  field: string;
  value: string;
  oldValue: string | null;
  createdAt: Date;
}

export interface WorkoutSummary {
  totalWorkouts: number;
  totalDurationMin: number;
  totalCaloriesBurned: number;
  averageDurationMin: number;
  averageRating: number | null;
  workoutsByType: Record<WorkoutType, number>;
  workoutsByMuscleGroup: Record<MuscleGroup, number>;
  weeklyFrequency: number;
  currentStreak: number;
  longestStreak: number;
}

export interface WorkoutStats {
  week: WorkoutStatsPeriod;
  month: WorkoutStatsPeriod;
  year: WorkoutStatsPeriod;
  allTime: WorkoutStatsPeriod;
}

export interface WorkoutStatsPeriod {
  workouts: number;
  durationMin: number;
  caloriesBurned: number;
  averageIntensity: number;
}

// ─── Exercise ─────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ExerciseType;
  difficulty: Difficulty;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: string | null;
  instructions: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  isCustom: boolean;
  createdByUser: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children?: ExerciseCategory[];
}

export interface MuscleGroupInfo {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

// ─── Nutrition ────────────────────────────────────────

export interface NutritionLog {
  id: string;
  userId: string;
  date: Date;
  totalCalories: number | null;
  totalProteinG: number | null;
  totalCarbsG: number | null;
  totalFatG: number | null;
  totalFiberG: number | null;
  totalSugarG: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionLogWithMeals extends NutritionLog {
  meals: Meal[];
}

export interface Meal {
  id: string;
  nutritionLogId: string;
  userId: string;
  type: MealType;
  name: string;
  time: Date;
  totalCalories: number | null;
  totalProteinG: number | null;
  totalCarbsG: number | null;
  totalFatG: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: FoodItem[];
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  servingSize: number;
  servingUnit: string;
  caloriesPerServing: number;
  proteinGPerServing: number;
  carbsGPerServing: number;
  fatGPerServing: number;
  fiberGPerServing: number | null;
  sugarGPerServing: number | null;
  sodiumMgPerServing: number | null;
  imageUrl: string | null;
  database: string;
  isVerified: boolean;
  createdByUser: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodItem {
  id: string;
  mealId: string;
  foodId: string;
  servings: number;
  customName: string | null;
  customCalories: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  food: Food;
}

export interface FoodSearchResult {
  food: Food;
  relevance: number;
}

export interface NutritionSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  targets: NutritionTargets;
  adherence: number; // percentage 0-100
}

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface MacroBreakdown {
  protein: { grams: number; calories: number; percentage: number };
  carbs: { grams: number; calories: number; percentage: number };
  fat: { grams: number; calories: number; percentage: number };
}

// ─── Health Metrics ───────────────────────────────────

export interface WaterIntake {
  id: string;
  userId: string;
  amountMl: number;
  time: Date;
  source: string | null;
  createdAt: Date;
}

export interface SleepLog {
  id: string;
  userId: string;
  date: Date;
  bedtime: Date;
  wakeTime: Date;
  durationHours: number | null;
  quality: number | null;
  deepSleepMin: number | null;
  remSleepMin: number | null;
  lightSleepMin: number | null;
  interruptions: number | null;
  notes: string | null;
  mood: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  weightKg: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  boneMassKg: number | null;
  waterPercent: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  bicepLeftCm: number | null;
  bicepRightCm: number | null;
  thighLeftCm: number | null;
  thighRightCm: number | null;
  calfLeftCm: number | null;
  calfRightCm: number | null;
  neckCm: number | null;
  shoulderCm: number | null;
  notes: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BodyMeasurementTrend {
  field: string;
  label: string;
  unit: string;
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  direction: "up" | "down" | "flat";
}

export interface DailyHealthSummary {
  date: Date;
  waterIntakeMl: number;
  sleepHours: number | null;
  sleepQuality: number | null;
  caloriesConsumed: number;
  caloriesBurned: number;
  workoutsCompleted: number;
  steps: number | null;
  heartRateAvg: number | null;
}

// ─── Goals ────────────────────────────────────────────

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  targetValue: number;
  currentValue: number;
  unit: string;
  startValue: number | null;
  startDate: Date;
  targetDate: Date | null;
  completedAt: Date | null;
  isPublic: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress[];
  children: Goal[];
  parent: Goal | null;
}

export interface GoalProgress {
  id: string;
  goalId: string;
  value: number;
  note: string | null;
  recordedAt: Date;
  createdAt: Date;
}

export interface GoalWithStats extends Goal {
  progressPercent: number;
  dailyRate: number;
  estimatedCompletion: Date | null;
  onTrack: boolean;
  daysRemaining: number | null;
}

// ─── Plans ────────────────────────────────────────────

export interface Plan {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  goal: FitnessGoal | null;
  durationWeeks: number | null;
  isTemplate: boolean;
  isPublic: boolean;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanWithDays extends Plan {
  days: PlanDay[];
}

export interface PlanDay {
  id: string;
  planId: string;
  userId: string;
  dayNumber: number;
  name: string;
  isRestDay: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  workouts: PlanWorkout[];
}

export interface PlanWorkout {
  id: string;
  planDayId: string;
  workoutId: string | null;
  userId: string;
  name: string;
  type: WorkoutType;
  targetMuscles: MuscleGroup[];
  estimatedMin: number | null;
  notes: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Challenges ───────────────────────────────────────

export interface Challenge {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  type: ChallengeType;
  status: ChallengeStatus;
  targetValue: number | null;
  unit: string | null;
  startDate: Date;
  endDate: Date;
  maxParticipants: number | null;
  isPublic: boolean;
  rules: string | null;
  prize: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeWithParticipants extends Challenge {
  participants: ChallengeParticipant[];
  creator: Pick<User, "id" | "name" | "username" | "image">;
  _count: { participants: number };
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  currentValue: number;
  rank: number | null;
  joinedAt: Date;
  leftAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: Pick<User, "id" | "name" | "username" | "image">;
}

export interface ChallengeLeaderboard {
  challengeId: string;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  currentValue: number;
  targetValue: number | null;
  progressPercent: number;
  trend: "up" | "down" | "stable";
}

export interface ChallengeStats {
  activeChallenges: number;
  completedChallenges: number;
  totalWins: number;
  currentRank: number;
  averagePlacement: number;
}

// ─── Achievements ─────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  category: string;
  tier: string;
  points: number;
  requirement: string;
  threshold: number;
  isHidden: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  createdAt: Date;
  achievement: Achievement;
}

export interface AchievementProgress {
  achievement: Achievement;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  isUnlocked: boolean;
}

export interface AchievementSummary {
  totalPoints: number;
  unlockedCount: number;
  totalCount: number;
  byTier: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    diamond: number;
  };
  recentUnlocks: UserAchievement[];
}

// ─── Social ───────────────────────────────────────────

export interface SocialPost {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  workoutId: string | null;
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialPostWithUser extends SocialPost {
  user: Pick<User, "id" | "name" | "username" | "image">;
  workout?: Pick<Workout, "id" | "name" | "type" | "durationMin" | "caloriesBurned">;
  isLiked?: boolean;
  isOwner?: boolean;
}

export interface SocialLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface SocialComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId: string | null;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: Pick<User, "id" | "name" | "username" | "image">;
  replies?: SocialComment[];
  isOwner?: boolean;
}

export interface SocialFeed {
  posts: SocialPostWithUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Notifications ────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  workoutReminders: boolean;
  goalUpdates: boolean;
  challengeUpdates: boolean;
  socialInteractions: boolean;
  achievements: boolean;
  planUpdates: boolean;
  weeklyReport: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

// ─── Subscriptions ────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialStart: Date | null;
  trialEnd: Date | null;
  features: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetric {
  id: string;
  userId: string;
  metric: string;
  value: number;
  period: string;
  metadata: Record<string, unknown> | null;
  date: Date;
  createdAt: Date;
}

export interface SubscriptionFeatures {
  maxWorkoutsPerMonth: number;
  maxExercises: number;
  advancedAnalytics: boolean;
  aiTrainer: boolean;
  customPlans: boolean;
  socialFeatures: boolean;
  exportData: boolean;
  prioritySupport: boolean;
}

export interface FeatureLimits {
  free: SubscriptionFeatures;
  pro: SubscriptionFeatures;
  coach: SubscriptionFeatures;
  enterprise: SubscriptionFeatures;
}

// ─── Devices ──────────────────────────────────────────

export interface Device {
  id: string;
  userId: string;
  type: DeviceType;
  name: string;
  model: string | null;
  serialNumber: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceData {
  id: string;
  deviceId: string;
  type: string;
  value: Record<string, unknown>;
  timestamp: Date;
  source: string | null;
  createdAt: Date;
}

export interface WearableSync {
  deviceId: string;
  lastSync: Date;
  dataPoints: number;
  errors: string[];
}

// ─── AI Features ──────────────────────────────────────

export interface AIRecommendation {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  data: Record<string, unknown> | null;
  priority: number;
  isRead: boolean;
  isAccepted: boolean | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AITrainerSession {
  id: string;
  userId: string;
  messages: AIMessage[];
  context: Record<string, unknown> | null;
  model: string | null;
  tokensUsed: number;
  rating: number | null;
  feedback: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    workoutSuggestion?: Partial<Workout>;
    exerciseSuggestion?: Partial<Exercise>;
    nutritionSuggestion?: Partial<NutritionSummary>;
    confidence?: number;
    sources?: string[];
  };
}

export interface AIWorkoutSuggestion {
  name: string;
  type: WorkoutType;
  difficulty: Difficulty;
  estimatedDurationMin: number;
  estimatedCaloriesBurned: number;
  exercises: AIExerciseSuggestion[];
  reasoning: string;
  confidence: number;
}

export interface AIExerciseSuggestion {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
}

export interface AINutritionSuggestion {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealPlan: AIMealSuggestion[];
  reasoning: string;
}

export interface AIMealSuggestion {
  name: string;
  type: MealType;
  foods: Array<{ name: string; amount: string; calories: number }>;
  totalCalories: number;
}

// ─── API Types ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// ─── Dashboard ────────────────────────────────────────

export interface DashboardData {
  user: UserWithProfile;
  today: {
    workout: Workout | null;
    nutrition: NutritionSummary | null;
    waterIntakeMl: number;
    sleep: SleepLog | null;
    steps: number | null;
  };
  weekStats: {
    workouts: number;
    caloriesBurned: number;
    averageNutrition: NutritionSummary;
    averageSleep: number;
    consistency: number;
  };
  goals: GoalWithStats[];
  recentActivity: ActivityItem[];
  recommendations: AIRecommendation[];
  notifications: NotificationCounts;
}

export interface ActivityItem {
  id: string;
  type: "workout" | "meal" | "measurement" | "achievement" | "social";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ─── Utility Types ────────────────────────────────────

export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type UpdateInput<T> = Partial<Omit<T, "id" | "createdAt" | "updatedAt">>>;
export type PublicProfile<T> = Omit<T, "passwordHash" | "email">;
export type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

// ─── Chart Types ──────────────────────────────────────

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
  date?: string;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  series?: string;
}

export interface ChartConfig {
  type: "line" | "bar" | "area" | "pie" | "radar" | "scatter";
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
}

// ─── WebSocket Types ──────────────────────────────────

export interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

export interface WSSyncEvent {
  type: "workout_update" | "measurement_update" | "notification" | "challenge_update" | "social_update";
  data: Record<string, unknown>;
  userId: string;
  timestamp: Date;
}

// ─── Analytics Types ──────────────────────────────────

export interface AnalyticsQuery {
  userId: string;
  metric: string;
  startDate: Date;
  endDate: Date;
  granularity: "day" | "week" | "month" | "year";
  groupBy?: string;
}

export interface AnalyticsResult {
  data: TimeSeriesDataPoint[];
  summary: {
    min: number;
    max: number;
    avg: number;
    total: number;
    trend: "up" | "down" | "stable";
  };
}
