import { z } from "zod";

// ─── Common Schemas ───────────────────────────────────

export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens");

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters")
  .trim();

export const optionalStringSchema = z.string().optional().nullable();

export const cuidSchema = z.string().cuid("Invalid ID format");
export const uuidSchema = z.string().uuid("Invalid UUID format");

// ─── Pagination ───────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Auth ─────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

// ─── Profile ──────────────────────────────────────────

export const profileSchema = z.object({
  heightCm: z.number().min(50).max(300).optional().nullable(),
  weightKg: z.number().min(20).max(500).optional().nullable(),
  targetWeightKg: z.number().min(20).max(500).optional().nullable(),
  dateOfBirth: z.coerce.date().max(new Date()).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  fitnessGoal: z.enum([
    "LOSE_WEIGHT", "GAIN_MUSCLE", "MAINTAIN", "IMPROVE_ENDURANCE",
    "INCREASE_STRENGTH", "IMPROVE_FLEXIBILITY", "GENERAL_FITNESS",
    "SPORT_SPECIFIC", "REHABILITATION",
  ]).optional(),
  activityLevel: z.enum([
    "SEDENTARY", "LIGHTLY_ACTIVE", "MODERATELY_ACTIVE",
    "VERY_ACTIVE", "EXTREMELY_ACTIVE",
  ]).optional(),
  bodyFatPercent: z.number().min(0).max(70).optional().nullable(),
  restingHr: z.number().min(30).max(250).optional().nullable(),
  maxHr: z.number().min(100).max(250).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  timezone: z.string().default("UTC"),
  units: z.enum(["metric", "imperial"]).default("metric"),
});

export const updateProfileSchema = profileSchema.partial();

// ─── Workout ──────────────────────────────────────────

export const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(1000).optional().nullable(),
  durationSec: z.number().int().min(0).max(86400).optional().nullable(),
  distanceM: z.number().min(0).max(100000).optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  isWarmup: z.boolean().default(false),
  isDropSet: z.boolean().default(false),
  isFailure: z.boolean().default(false),
  restAfterSec: z.number().int().min(0).max(600).optional().nullable(),
  completed: z.boolean().default(false),
});

export const workoutExerciseSchema = z.object({
  exerciseId: cuidSchema,
  order: z.number().int().min(0).max(50).default(0),
  restSec: z.number().int().min(0).max(600).default(90),
  notes: z.string().max(500).optional().nullable(),
  supersetId: z.string().optional().nullable(),
  sets: z.array(workoutSetSchema).min(1, "At least one set is required"),
});

export const createWorkoutSchema = z.object({
  name: z.string().min(1, "Workout name is required").max(100),
  description: z.string().max(1000).optional().nullable(),
  type: z.enum([
    "STRENGTH", "CARDIO", "FLEXIBILITY", "HIIT", "CROSSFIT", "YOGA",
    "PILATES", "SWIMMING", "CYCLING", "RUNNING", "WALKING", "SPORTS",
    "CUSTOM", "REST_DAY",
  ]).default("STRENGTH"),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]).default("INTERMEDIATE"),
  isPublic: z.boolean().default(false),
  exercises: z.array(workoutExerciseSchema).optional(),
});

export const updateWorkoutSchema = createWorkoutSchema.partial().extend({
  id: cuidSchema,
});

export const logWorkoutSchema = z.object({
  workoutId: cuidSchema,
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  durationMin: z.number().int().min(0).max(1440).optional(),
  caloriesBurned: z.number().int().min(0).max(10000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Exercise ─────────────────────────────────────────

export const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required").max(100),
  slug: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum([
    "COMPOUND", "ISOLATION", "CARDIO", "BODYWEIGHT", "MACHINE",
    "FREE_WEIGHT", "CABLE", "RESISTANCE_BAND", "PLYOMETRIC",
  ]).default("COMPOUND"),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]).default("INTERMEDIATE"),
  muscleGroup: z.enum([
    "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "FOREARMS",
    "ABS", "OBLIQUES", "QUADRICEPS", "HAMSTRINGS", "CALVES",
    "GLUTES", "TRAPS", "LATS", "FULL_BODY", "OTHER",
  ]).default("OTHER"),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.string().max(100).optional(),
  instructions: z.string().max(5000).optional(),
  videoUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export const updateExerciseSchema = exerciseSchema.partial();

// ─── Nutrition ────────────────────────────────────────

export const foodSchema = z.object({
  name: z.string().min(1, "Food name is required").max(200),
  brand: z.string().max(200).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  servingSize: z.number().min(0.01).max(10000),
  servingUnit: z.string().min(1, "Serving unit is required").max(50),
  caloriesPerServing: z.number().int().min(0).max(50000),
  proteinGPerServing: z.number().min(0).max(1000),
  carbsGPerServing: z.number().min(0).max(1000),
  fatGPerServing: z.number().min(0).max(1000),
  fiberGPerServing: z.number().min(0).max(500).optional().nullable(),
  sugarGPerServing: z.number().min(0).max(500).optional().nullable(),
  sodiumMgPerServing: z.number().min(0).max(50000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export const mealItemSchema = z.object({
  foodId: cuidSchema,
  servings: z.number().min(0.01).max(100),
  customName: z.string().max(200).optional().nullable(),
  customCalories: z.number().int().min(0).max(50000).optional().nullable(),
  notes: z.string().max(200).optional().nullable(),
});

export const mealSchema = z.object({
  type: z.enum([
    "BREAKFAST", "LUNCH", "DINNER", "SNACK",
    "PRE_WORKOUT", "POST_WORKOUT", "BEFORE_BED",
  ]).default("LUNCH"),
  name: z.string().min(1, "Meal name is required").max(100),
  time: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(mealItemSchema).min(1, "At least one food item is required"),
});

export const nutritionLogSchema = z.object({
  date: z.coerce.date(),
  totalCalories: z.number().int().min(0).max(50000).optional(),
  totalProteinG: z.number().min(0).max(1000).optional(),
  totalCarbsG: z.number().min(0).max(1000).optional(),
  totalFatG: z.number().min(0).max(1000).optional(),
  totalFiberG: z.number().min(0).max(500).optional(),
  totalSugarG: z.number().min(0).max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// ─── Water Intake ─────────────────────────────────────

export const waterIntakeSchema = z.object({
  amountMl: z.number().int().min(1, "Amount must be at least 1ml").max(10000),
  time: z.coerce.date().optional(),
  source: z.string().max(50).optional().nullable(),
});

// ─── Sleep ────────────────────────────────────────────

export const sleepLogSchema = z.object({
  date: z.coerce.date(),
  bedtime: z.coerce.date(),
  wakeTime: z.coerce.date(),
  durationHours: z.number().min(0).max(24).optional(),
  quality: z.number().int().min(1).max(10).optional(),
  deepSleepMin: z.number().int().min(0).max(600).optional().nullable(),
  remSleepMin: z.number().int().min(0).max(600).optional().nullable(),
  lightSleepMin: z.number().int().min(0).max(600).optional().nullable(),
  interruptions: z.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  mood: z.string().max(50).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
}).refine((data) => data.wakeTime > data.bedtime, {
  message: "Wake time must be after bedtime",
  path: ["wakeTime"],
});

// ─── Body Measurement ─────────────────────────────────

export const bodyMeasurementSchema = z.object({
  date: z.coerce.date(),
  weightKg: z.number().min(20).max(500).optional().nullable(),
  bodyFatPercent: z.number().min(0).max(70).optional().nullable(),
  muscleMassKg: z.number().min(0).max(200).optional().nullable(),
  boneMassKg: z.number().min(0).max(20).optional().nullable(),
  waterPercent: z.number().min(0).max(100).optional().nullable(),
  waistCm: z.number().min(0).max(300).optional().nullable(),
  hipsCm: z.number().min(0).max(300).optional().nullable(),
  chestCm: z.number().min(0).max(300).optional().nullable(),
  bicepLeftCm: z.number().min(0).max(100).optional().nullable(),
  bicepRightCm: z.number().min(0).max(100).optional().nullable(),
  thighLeftCm: z.number().min(0).max(150).optional().nullable(),
  thighRightCm: z.number().min(0).max(150).optional().nullable(),
  calfLeftCm: z.number().min(0).max(100).optional().nullable(),
  calfRightCm: z.number().min(0).max(100).optional().nullable(),
  neckCm: z.number().min(0).max(100).optional().nullable(),
  shoulderCm: z.number().min(0).max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
});

// ─── Goal ─────────────────────────────────────────────

export const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  type: z.enum([
    "WEIGHT", "BODY_FAT", "MUSCLE_MASS", "STRENGTH", "ENDURANCE",
    "CONSISTENCY", "CALORIE", "WATER", "SLEEP", "CUSTOM",
  ]),
  targetValue: z.number().min(0),
  unit: z.string().min(1, "Unit is required").max(20),
  startValue: z.number().optional().nullable(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  isPublic: z.boolean().default(false),
  parentId: cuidSchema.optional().nullable(),
});

export const updateGoalSchema = goalSchema.partial().extend({
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "FAILED", "ARCHIVED"]).optional(),
});

export const goalProgressSchema = z.object({
  value: z.number(),
  note: z.string().max(200).optional().nullable(),
  recordedAt: z.coerce.date().optional(),
});

// ─── Plan ─────────────────────────────────────────────

export const planWorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([
    "STRENGTH", "CARDIO", "FLEXIBILITY", "HIIT", "CROSSFIT", "YOGA",
    "PILATES", "SWIMMING", "CYCLING", "RUNNING", "WALKING", "SPORTS",
    "CUSTOM", "REST_DAY",
  ]).default("STRENGTH"),
  targetMuscles: z.array(z.string()).optional(),
  estimatedMin: z.number().int().min(0).max(480).optional(),
  notes: z.string().max(500).optional().nullable(),
  order: z.number().int().min(0).max(50).default(0),
});

export const planDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  name: z.string().min(1).max(50),
  isRestDay: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
  workouts: z.array(planWorkoutSchema).optional(),
});

export const planSchema = z.object({
  name: z.string().min(1, "Plan name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]).default("INTERMEDIATE"),
  goal: z.enum([
    "LOSE_WEIGHT", "GAIN_MUSCLE", "MAINTAIN", "IMPROVE_ENDURANCE",
    "INCREASE_STRENGTH", "IMPROVE_FLEXIBILITY", "GENERAL_FITNESS",
    "SPORT_SPECIFIC", "REHABILITATION",
  ]).optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  isTemplate: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  days: z.array(planDaySchema).min(1, "At least one day is required").max(7),
});

export const updatePlanSchema = planSchema.partial();

// ─── Challenge ────────────────────────────────────────

export const challengeSchema = z.object({
  name: z.string().min(1, "Challenge name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum([
    "WORKOUT_COUNT", "TOTAL_VOLUME", "CALORIES_BURNED",
    "STREAK", "BODY_MEASUREMENT", "WEIGHT_LOSS", "CUSTOM",
  ]),
  targetValue: z.number().min(0).optional(),
  unit: z.string().max(20).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  maxParticipants: z.number().int().min(2).max(10000).optional(),
  isPublic: z.boolean().default(true),
  rules: z.string().max(5000).optional().nullable(),
  prize: z.string().max(500).optional().nullable(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateChallengeSchema = challengeSchema.partial();

// ─── Social ───────────────────────────────────────────

export const socialPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
  imageUrl: z.string().url().optional().nullable(),
  workoutId: cuidSchema.optional().nullable(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
});

export const socialCommentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(2000),
  parentId: cuidSchema.optional().nullable(),
});

// ─── Notification Preferences ─────────────────────────

export const notificationPreferenceSchema = z.object({
  workoutReminders: z.boolean().default(true),
  goalUpdates: z.boolean().default(true),
  challengeUpdates: z.boolean().default(true),
  socialInteractions: z.boolean().default(true),
  achievements: z.boolean().default(true),
  planUpdates: z.boolean().default(true),
  weeklyReport: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  quietHoursStart: z.string().optional().nullable(),
  quietHoursEnd: z.string().optional().nullable(),
  timezone: z.string().default("UTC"),
});

// ─── Device ───────────────────────────────────────────

export const deviceSchema = z.object({
  type: z.enum([
    "FITBIT", "APPLE_WATCH", "GARMIN", "OURA_RING", "WHOOP",
    "SAMSUNG_GALAXY_WATCH", "GOOGLE_FIT", "STRAVA",
    "MYFITNESSPAL", "OTHER",
  ]),
  name: z.string().min(1).max(100),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
});

// ─── Subscription ─────────────────────────────────────

export const subscriptionSchema = z.object({
  tier: z.enum(["FREE", "PRO", "COACH", "ENTERPRISE"]),
  stripePaymentMethodId: z.string().optional(),
});

// ─── AI Trainer ───────────────────────────────────────

export const aiTrainerMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000),
  sessionId: cuidSchema.optional(),
  context: z.object({
    currentWorkout: z.any().optional(),
    recentWorkouts: z.array(z.any()).optional(),
    goals: z.array(z.any()).optional(),
    measurements: z.any().optional(),
  }).optional(),
});

// ─── Search ───────────────────────────────────────────

export const searchSchema = z.object({
  query: z.string().min(1, "Search query is required").max(200).trim(),
  type: z.enum(["exercises", "foods", "workouts", "users", "challenges", "all"]).default("all"),
  limit: z.number().int().min(1).max(50).default(20),
});

// ─── Date Range ───────────────────────────────────────

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

// ─── Admin ────────────────────────────────────────────

export const adminUserUpdateSchema = z.object({
  role: z.enum(["USER", "COACH", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  isPremium: z.boolean().optional(),
});

export const reportSchema = z.object({
  reason: z.enum(["SPAM", "INAPPROPRIATE", "HARASSMENT", "MISINFORMATION", "OTHER"]),
  details: z.string().max(2000).optional(),
  contentType: z.enum(["post", "comment", "user"]),
  contentId: cuidSchema,
});

// ─── Export all types ─────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type FoodInput = z.infer<typeof foodSchema>;
export type MealInput = z.infer<typeof mealSchema>;
export type NutritionLogInput = z.infer<typeof nutritionLogSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type ChallengeInput = z.infer<typeof challengeSchema>;
export type SocialPostInput = z.infer<typeof socialPostSchema>;
export type AITrainerMessageInput = z.infer<typeof aiTrainerMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
