// Goals
export {
  GoalService,
  goalService,
  GoalType,
  GoalStatus,
  GoalPriority,
  GoalCategory,
  GOAL_TYPE_CONFIG,
  createGoalSchema,
  updateGoalSchema,
  milestoneSchema,
} from "./goal-service";

export type {
  CreateGoalInput,
  UpdateGoalInput,
  MilestoneInput,
  Goal,
  Milestone,
  GoalProgress,
  GoalReminder,
  GoalHistoryEntry,
  GoalStats,
} from "./goal-service";

// Achievements
export {
  AchievementService,
  achievementService,
  AchievementCategory,
  AchievementRarity,
  RARITY_CONFIG,
  CATEGORY_ICONS,
  ACHIEVEMENT_DEFINITIONS,
  createAchievementProgressSchema,
} from "./achievement-service";

export type {
  AchievementDefinition,
  AchievementCriteria,
  UserAchievement,
  AchievementWithProgress,
  LeaderboardEntry,
  AchievementStats,
} from "./achievement-service";

// Challenges
export {
  ChallengeService,
  challengeService,
  ChallengeType,
  ChallengeStatus,
  ChallengePrivacy,
  ParticipantStatus,
  TeamRole,
  CHALLENGE_TYPE_CONFIG,
  createChallengeSchema,
  joinChallengeSchema,
  updateChallengeProgressSchema,
} from "./challenge-service";

export type {
  CreateChallengeInput,
  JoinChallengeInput,
  UpdateChallengeProgressInput,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam,
  DailyProgress,
  ChallengeLeaderboardEntry,
  ChallengeStats,
  ChallengeActivity,
  ChallengeReward,
} from "./challenge-service";

// Social
export {
  SocialService,
  socialService,
  PostType,
  FollowStatus,
  MessageStatus,
  ReactionType,
  REACTION_EMOJIS,
  createPostSchema,
  createCommentSchema,
  sendMessageSchema,
  createConversationSchema,
} from "./social-service";

export type {
  CreatePostInput,
  CreateCommentInput,
  SendMessageInput,
  CreateConversationInput,
  Post,
  PostAuthor,
  Comment,
  Reaction,
  Follow,
  Conversation,
  Message,
  WorkoutShare,
  SocialStats,
} from "./social-service";

// Leaderboards
export {
  LeaderboardService,
  leaderboardService,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardMetric,
  LEADERBOARD_METRIC_CONFIG,
} from "./leaderboard-service";

export type {
  LeaderboardEntry as LeaderboardBoardEntry,
  Leaderboard,
  UserRankHistory,
  LeaderboardStats,
  LeaderboardConfig,
} from "./leaderboard-service";

// Feed
export {
  FeedService,
  feedService,
  FeedItemType,
  FEED_ITEM_CONFIG,
} from "./feed-service";

export type {
  FeedItem,
  FeedAuthor,
  FeedReaction as FeedItemReaction,
  FeedItemMetadata,
  WorkoutCompletedMetadata,
  AchievementUnlockedMetadata,
  ChallengeUpdateMetadata,
  GoalMilestoneMetadata,
  GoalCompletedMetadata,
  PostSharedMetadata,
  NewFollowerMetadata,
  StreakMilestoneMetadata,
  PersonalRecordMetadata,
  PlanCompletedMetadata,
  FeedConfig,
  FeedPage,
} from "./feed-service";

// Notifications
export {
  NotificationService,
  notificationService,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NOTIFICATION_TYPE_CONFIG,
  createNotificationSchema,
  notificationPreferencesSchema,
} from "./notification-service";

export type {
  CreateNotificationInput,
  NotificationPreferencesInput,
  Notification,
  NotificationPreferences,
  NotificationGroup,
  NotificationStats,
} from "./notification-service";

// Plans
export {
  PlanService,
  planService,
  PlanType,
  PlanDifficulty,
  PlanStatus,
  WorkoutDayType,
  ExerciseCategory,
  PLAN_TYPE_CONFIG,
  DIFFICULTY_CONFIG,
  createPlanSchema,
  updatePlanSchema,
  exerciseSchema,
  workoutDaySchema,
  weekSchema,
} from "./plan-service";

export type {
  CreatePlanInput,
  UpdatePlanInput,
  ExerciseInput,
  WorkoutDayInput,
  WeekInput,
  Exercise,
  WorkoutDay,
  Week,
  TrainingPlan,
  PlanProgress,
  PlanTemplate,
  PlanStats,
} from "./plan-service";

// Schedule
export {
  ScheduleService,
  scheduleService,
  ScheduleSlotType,
  ReminderType,
  CalendarSource,
  SLOT_TYPE_CONFIG,
  scheduleSlotSchema,
  createReminderSchema,
} from "./schedule-service";

export type {
  ScheduleSlotInput,
  CreateReminderInput as CreateScheduleReminderInput,
  ScheduleSlot,
  ScheduleReminder,
  WeeklySchedule,
  CalendarEvent,
  ScheduleConflict,
  ScheduleStats,
} from "./schedule-service";
