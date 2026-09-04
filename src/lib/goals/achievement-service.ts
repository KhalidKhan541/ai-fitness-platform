import { z } from "zod";
import { format, differenceInDays, parseISO } from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum AchievementCategory {
  WORKOUT = "WORKOUT",
  NUTRITION = "NUTRITION",
  STREAK = "STREAK",
  SOCIAL = "SOCIAL",
  CHALLENGE = "CHALLENGE",
  GOAL = "GOAL",
  MILESTONE = "MILESTONE",
  SPECIAL = "SPECIAL",
}

export enum AchievementRarity {
  COMMON = "COMMON",
  UNCOMMON = "UNCOMMON",
  RARE = "RARE",
  EPIC = "EPIC",
  LEGENDARY = "LEGENDARY",
}

export const RARITY_CONFIG: Record<
  AchievementRarity,
  { label: string; color: string; points: number; dropRate: number }
> = {
  [AchievementRarity.COMMON]: {
    label: "Common",
    color: "#9ca3af",
    points: 10,
    dropRate: 0.5,
  },
  [AchievementRarity.UNCOMMON]: {
    label: "Uncommon",
    color: "#22c55e",
    points: 25,
    dropRate: 0.3,
  },
  [AchievementRarity.RARE]: {
    label: "Rare",
    color: "#3b82f6",
    points: 50,
    dropRate: 0.15,
  },
  [AchievementRarity.EPIC]: {
    label: "Epic",
    color: "#a855f7",
    points: 100,
    dropRate: 0.04,
  },
  [AchievementRarity.LEGENDARY]: {
    label: "Legendary",
    color: "#f59e0b",
    points: 250,
    dropRate: 0.01,
  },
};

export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  [AchievementCategory.WORKOUT]: "🏋️",
  [AchievementCategory.NUTRITION]: "🥗",
  [AchievementCategory.STREAK]: "🔥",
  [AchievementCategory.SOCIAL]: "👥",
  [AchievementCategory.CHALLENGE]: "🏆",
  [AchievementCategory.GOAL]: "🎯",
  [AchievementCategory.MILESTONE]: "⭐",
  [AchievementCategory.SPECIAL]: "✨",
};

// ─── Achievement Definitions (100+) ────────────────────────────────

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  criteria: AchievementCriteria;
  points: number;
  isHidden: boolean;
  tier: number;
  maxTier: number;
}

export type AchievementCriteria =
  | { type: "workout_count"; operator: ">=" | "==" | "<="; value: number }
  | { type: "workout_duration"; operator: ">=" | "=="; value: number; unit: "minutes" | "hours" }
  | { type: "calories_burned"; operator: ">="; value: number }
  | { type: "streak_days"; operator: ">="; value: number }
  | { type: "weight_lost"; operator: ">="; value: number }
  | { type: "weight_gained"; operator: ">="; value: number }
  | { type: "steps_total"; operator: ">="; value: number }
  | { type: "water_intake"; operator: ">="; value: number; unit: "ml" | "liters" }
  | { type: "meals_logged"; operator: ">="; value: number }
  | { type: "protein_intake"; operator: ">="; value: number; unit: "g" }
  | { type: "goals_completed"; operator: ">="; value: number }
  | { type: "challenges_completed"; operator: ">="; value: number }
  | { type: "challenges_joined"; operator: ">="; value: number }
  | { type: "friends_added"; operator: ">="; value: number }
  | { type: "posts_created"; operator: ">="; value: number }
  | { type: "likes_received"; operator: ">="; value: number }
  | { type: "comments_received"; operator: ">="; value: number }
  | { type: "leaderboard_rank"; operator: "<="; value: number }
  | { type: "personal_record"; exercise: string; operator: ">="; value: number; unit: "kg" | "reps" | "minutes" }
  | { type: "total_volume"; operator: ">="; value: number; unit: "kg" | "lbs" }
  | { type: "workout_type_count"; workoutType: string; operator: ">="; value: number }
  | { type: "time_of_day"; period: "morning" | "afternoon" | "night"; count: number }
  | { type: "special_date"; date: string; achievement: string }
  | { type: "consecutive_weeks"; operator: ">="; value: number }
  | { type: "body_fat_reduced"; operator: ">="; value: number }
  | { type: "muscle_mass_gained"; operator: ">="; value: number };

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ── Workout Achievements ──
  {
    id: "first_workout", name: "First Step", description: "Complete your first workout",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.COMMON, icon: "🎯",
    criteria: { type: "workout_count", operator: ">=", value: 1 }, points: 10, isHidden: false, tier: 1, maxTier: 1,
  },
  {
    id: "workout_5", name: "Getting Started", description: "Complete 5 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.COMMON, icon: "💪",
    criteria: { type: "workout_count", operator: ">=", value: 5 }, points: 10, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "workout_10", name: "Dedicated", description: "Complete 10 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "🔥",
    criteria: { type: "workout_count", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "workout_25", name: "Committed", description: "Complete 25 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "⚡",
    criteria: { type: "workout_count", operator: ">=", value: 25 }, points: 25, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "workout_50", name: "Half Century", description: "Complete 50 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🏅",
    criteria: { type: "workout_count", operator: ">=", value: 50 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "workout_100", name: "Century Club", description: "Complete 100 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.EPIC, icon: "💯",
    criteria: { type: "workout_count", operator: ">=", value: 100 }, points: 100, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "workout_250", name: "Iron Will", description: "Complete 250 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.EPIC, icon: "🏋️",
    criteria: { type: "workout_count", operator: ">=", value: 250 }, points: 100, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "workout_500", name: "Legendary Warrior", description: "Complete 500 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.LEGENDARY, icon: "👑",
    criteria: { type: "workout_count", operator: ">=", value: 500 }, points: 250, isHidden: false, tier: 1, maxTier: 1,
  },
  {
    id: "workout_1000", name: "Fitness Deity", description: "Complete 1000 workouts",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.LEGENDARY, icon: "⚡",
    criteria: { type: "workout_count", operator: ">=", value: 1000 }, points: 250, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "long_workout_60", name: "Marathon Session", description: "Complete a workout lasting 60+ minutes",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "⏰",
    criteria: { type: "workout_duration", operator: ">=", value: 60, unit: "minutes" }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "long_workout_90", name: "Endurance Master", description: "Complete a workout lasting 90+ minutes",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🏃",
    criteria: { type: "workout_duration", operator: ">=", value: 90, unit: "minutes" }, points: 50, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "long_workout_120", name: "Ultra Endurance", description: "Complete a workout lasting 2+ hours",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.EPIC, icon: "🦾",
    criteria: { type: "workout_duration", operator: ">=", value: 120, unit: "minutes" }, points: 100, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "calories_500", name: "Calorie Crusher", description: "Burn 500 calories in a single workout",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "🔥",
    criteria: { type: "calories_burned", operator: ">=", value: 500 }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "calories_1000", name: "Inferno", description: "Burn 1000 calories in a single workout",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🌋",
    criteria: { type: "calories_burned", operator: ">=", value: 1000 }, points: 50, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "calories_5000", name: "Walking Furnace", description: "Burn 5000 total calories",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.EPIC, icon: "☀️",
    criteria: { type: "calories_burned", operator: ">=", value: 5000 }, points: 100, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "calories_50000", name: "Solar Powered", description: "Burn 50,000 total calories",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.LEGENDARY, icon: "🌟",
    criteria: { type: "calories_burned", operator: ">=", value: 50000 }, points: 250, isHidden: false, tier: 1, maxTier: 1,
  },
  {
    id: "early_bird", name: "Early Bird", description: "Complete 10 workouts before 7 AM",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🌅",
    criteria: { type: "time_of_day", period: "morning", count: 10 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "night_owl", name: "Night Owl", description: "Complete 10 workouts after 9 PM",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🦉",
    criteria: { type: "time_of_day", period: "night", count: 10 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "total_volume_1000", name: "Ton Lifter", description: "Lift a total volume of 1,000 kg",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "📦",
    criteria: { type: "total_volume", operator: ">=", value: 1000, unit: "kg" }, points: 25, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "total_volume_10000", name: "Volume Beast", description: "Lift a total volume of 10,000 kg",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🐂",
    criteria: { type: "total_volume", operator: ">=", value: 10000, unit: "kg" }, points: 50, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "total_volume_100000", name: "Volume Titan", description: "Lift a total volume of 100,000 kg",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.EPIC, icon: "🗻",
    criteria: { type: "total_volume", operator: ">=", value: 100000, unit: "kg" }, points: 100, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "total_volume_1000000", name: "Volume God", description: "Lift a total volume of 1,000,000 kg",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.LEGENDARY, icon: "🌍",
    criteria: { type: "total_volume", operator: ">=", value: 1000000, unit: "kg" }, points: 250, isHidden: false, tier: 4, maxTier: 4,
  },
  {
    id: "running_10k", name: "10K Runner", description: "Run a total of 10 kilometers",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "🏃",
    criteria: { type: "workout_type_count", workoutType: "running", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "yoga_10", name: "Yoga Devotee", description: "Complete 10 yoga sessions",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "🧘",
    criteria: { type: "workout_type_count", workoutType: "yoga", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "hiit_20", name: "HIIT Machine", description: "Complete 20 HIIT sessions",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "⚡",
    criteria: { type: "workout_type_count", workoutType: "hiit", operator: ">=", value: 20 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "swimming_10", name: "Aqua Athlete", description: "Complete 10 swimming sessions",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🏊",
    criteria: { type: "workout_type_count", workoutType: "swimming", operator: ">=", value: 10 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },

  // ── Streak Achievements ──
  {
    id: "streak_3", name: "Hat Trick", description: "Maintain a 3-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.COMMON, icon: "🔥",
    criteria: { type: "streak_days", operator: ">=", value: 3 }, points: 10, isHidden: false, tier: 1, maxTier: 5,
  },
  {
    id: "streak_7", name: "Week Warrior", description: "Maintain a 7-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.UNCOMMON, icon: "🗓️",
    criteria: { type: "streak_days", operator: ">=", value: 7 }, points: 25, isHidden: false, tier: 2, maxTier: 5,
  },
  {
    id: "streak_14", name: "Fortnight Fighter", description: "Maintain a 14-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.RARE, icon: "💪",
    criteria: { type: "streak_days", operator: ">=", value: 14 }, points: 50, isHidden: false, tier: 3, maxTier: 5,
  },
  {
    id: "streak_30", name: "Monthly Machine", description: "Maintain a 30-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.EPIC, icon: "🏆",
    criteria: { type: "streak_days", operator: ">=", value: 30 }, points: 100, isHidden: false, tier: 4, maxTier: 5,
  },
  {
    id: "streak_60", name: "Unstoppable", description: "Maintain a 60-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.EPIC, icon: "🚀",
    criteria: { type: "streak_days", operator: ">=", value: 60 }, points: 100, isHidden: false, tier: 5, maxTier: 5,
  },
  {
    id: "streak_100", name: "Century Streak", description: "Maintain a 100-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.LEGENDARY, icon: "💯",
    criteria: { type: "streak_days", operator: ">=", value: 100 }, points: 250, isHidden: false, tier: 1, maxTier: 1,
  },
  {
    id: "streak_365", name: "Year of Power", description: "Maintain a 365-day workout streak",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.LEGENDARY, icon: "👑",
    criteria: { type: "streak_days", operator: ">=", value: 365 }, points: 250, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "consecutive_weeks_4", name: "Monthly Dedication", description: "Work out every day for 4 consecutive weeks",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.RARE, icon: "📅",
    criteria: { type: "consecutive_weeks", operator: ">=", value: 4 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "consecutive_weeks_12", name: "Quarter Commitment", description: "Work out every day for 12 consecutive weeks",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.EPIC, icon: "📊",
    criteria: { type: "consecutive_weeks", operator: ">=", value: 12 }, points: 100, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "consecutive_weeks_52", name: "Annual Dedication", description: "Work out every day for 52 consecutive weeks",
    category: AchievementCategory.STREAK, rarity: AchievementRarity.LEGENDARY, icon: "🎯",
    criteria: { type: "consecutive_weeks", operator: ">=", value: 52 }, points: 250, isHidden: false, tier: 3, maxTier: 3,
  },

  // ── Nutrition Achievements ──
  {
    id: "meals_10", name: "Food Tracker", description: "Log 10 meals",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.COMMON, icon: "📝",
    criteria: { type: "meals_logged", operator: ">=", value: 10 }, points: 10, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "meals_50", name: "Nutrition Logger", description: "Log 50 meals",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.UNCOMMON, icon: "🥗",
    criteria: { type: "meals_logged", operator: ">=", value: 50 }, points: 25, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "meals_200", name: "Diet Master", description: "Log 200 meals",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.RARE, icon: "📊",
    criteria: { type: "meals_logged", operator: ">=", value: 200 }, points: 50, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "meals_500", name: "Calorie Connoisseur", description: "Log 500 meals",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.EPIC, icon: "🎯",
    criteria: { type: "meals_logged", operator: ">=", value: 500 }, points: 100, isHidden: false, tier: 4, maxTier: 4,
  },
  {
    id: "protein_100", name: "Protein Pioneer", description: "Hit 100g protein in a day",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.UNCOMMON, icon: "🥩",
    criteria: { type: "protein_intake", operator: ">=", value: 100, unit: "g" }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "protein_150", name: "Protein Pro", description: "Hit 150g protein in a day",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.RARE, icon: "💪",
    criteria: { type: "protein_intake", operator: ">=", value: 150, unit: "g" }, points: 50, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "protein_200", name: "Protein Monster", description: "Hit 200g protein in a day",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.EPIC, icon: "🦍",
    criteria: { type: "protein_intake", operator: ">=", value: 200, unit: "g" }, points: 100, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "water_2l", name: "Hydration Hero", description: "Drink 2 liters of water in a day",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.COMMON, icon: "💧",
    criteria: { type: "water_intake", operator: ">=", value: 2, unit: "liters" }, points: 10, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "water_3l", name: "Water Champion", description: "Drink 3 liters of water in a day",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.UNCOMMON, icon: "🌊",
    criteria: { type: "water_intake", operator: ">=", value: 3, unit: "liters" }, points: 25, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "water_4l", name: "Aqua King", description: "Drink 4 liters of water in a day",
    category: AchievementCategory.NUTRITION, rarity: AchievementRarity.RARE, icon: "🏊",
    criteria: { type: "water_intake", operator: ">=", value: 4, unit: "liters" }, points: 50, isHidden: false, tier: 3, maxTier: 3,
  },

  // ── Social Achievements ──
  {
    id: "first_friend", name: "Social Butterfly", description: "Add your first friend",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.COMMON, icon: "🤝",
    criteria: { type: "friends_added", operator: ">=", value: 1 }, points: 10, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "friends_10", name: "Popular", description: "Add 10 friends",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.UNCOMMON, icon: "👥",
    criteria: { type: "friends_added", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "friends_50", name: "Networker", description: "Add 50 friends",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.RARE, icon: "🌐",
    criteria: { type: "friends_added", operator: ">=", value: 50 }, points: 50, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "friends_100", name: "Influencer", description: "Add 100 friends",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.EPIC, icon: "⭐",
    criteria: { type: "friends_added", operator: ">=", value: 100 }, points: 100, isHidden: false, tier: 4, maxTier: 4,
  },
  {
    id: "first_post", name: "First Share", description: "Share your first workout",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.COMMON, icon: "📤",
    criteria: { type: "posts_created", operator: ">=", value: 1 }, points: 10, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "posts_10", name: "Storyteller", description: "Create 10 posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.UNCOMMON, icon: "📖",
    criteria: { type: "posts_created", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "posts_50", name: "Content Creator", description: "Create 50 posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.RARE, icon: "🎬",
    criteria: { type: "posts_created", operator: ">=", value: 50 }, points: 50, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "likes_10", name: "Appreciated", description: "Receive 10 likes on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.UNCOMMON, icon: "❤️",
    criteria: { type: "likes_received", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "likes_50", name: "Fan Favorite", description: "Receive 50 likes on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.RARE, icon: "🔥",
    criteria: { type: "likes_received", operator: ">=", value: 50 }, points: 50, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "likes_200", name: "Trending", description: "Receive 200 likes on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.EPIC, icon: "📈",
    criteria: { type: "likes_received", operator: ">=", value: 200 }, points: 100, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "likes_1000", name: "Superstar", description: "Receive 1000 likes on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.LEGENDARY, icon: "🌟",
    criteria: { type: "likes_received", operator: ">=", value: 1000 }, points: 250, isHidden: false, tier: 4, maxTier: 4,
  },
  {
    id: "comments_10", name: "Conversationalist", description: "Receive 10 comments on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.UNCOMMON, icon: "💬",
    criteria: { type: "comments_received", operator: ">=", value: 10 }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "comments_50", name: "Discussion Leader", description: "Receive 50 comments on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.RARE, icon: "🗣️",
    criteria: { type: "comments_received", operator: ">=", value: 50 }, points: 50, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "comments_200", name: "Community Pillar", description: "Receive 200 comments on your posts",
    category: AchievementCategory.SOCIAL, rarity: AchievementRarity.EPIC, icon: "🏛️",
    criteria: { type: "comments_received", operator: ">=", value: 200 }, points: 100, isHidden: false, tier: 3, maxTier: 3,
  },

  // ── Challenge Achievements ──
  {
    id: "first_challenge", name: "Challenger", description: "Join your first challenge",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.COMMON, icon: "🏆",
    criteria: { type: "challenges_joined", operator: ">=", value: 1 }, points: 10, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "challenges_5", name: "Competitor", description: "Join 5 challenges",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.UNCOMMON, icon: "🎯",
    criteria: { type: "challenges_joined", operator: ">=", value: 5 }, points: 25, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "challenges_20", name: "Challenge Junkie", description: "Join 20 challenges",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.RARE, icon: "🎪",
    criteria: { type: "challenges_joined", operator: ">=", value: 20 }, points: 50, isHidden: false, tier: 3, maxTier: 3,
  },
  {
    id: "challenge_winner", name: "Victorious", description: "Win a challenge (finish 1st)",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.RARE, icon: "🥇",
    criteria: { type: "leaderboard_rank", operator: "<=", value: 1 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "challenge_top3", name: "Podium Finisher", description: "Finish in the top 3 of a challenge",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.UNCOMMON, icon: "🏅",
    criteria: { type: "leaderboard_rank", operator: "<=", value: 3 }, points: 25, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "challenge_top10", name: "Top Ten", description: "Finish in the top 10 of a challenge",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.COMMON, icon: "🔟",
    criteria: { type: "leaderboard_rank", operator: "<=", value: 10 }, points: 10, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "challenge_complete_1", name: "Finisher", description: "Complete your first challenge",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.COMMON, icon: "✅",
    criteria: { type: "challenges_completed", operator: ">=", value: 1 }, points: 10, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "challenge_complete_5", name: "Serial Finisher", description: "Complete 5 challenges",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.UNCOMMON, icon: "🏅",
    criteria: { type: "challenges_completed", operator: ">=", value: 5 }, points: 25, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "challenge_complete_10", name: "Challenge Master", description: "Complete 10 challenges",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.RARE, icon: "👑",
    criteria: { type: "challenges_completed", operator: ">=", value: 10 }, points: 50, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "challenge_complete_25", name: "Challenge Legend", description: "Complete 25 challenges",
    category: AchievementCategory.CHALLENGE, rarity: AchievementRarity.EPIC, icon: "🏆",
    criteria: { type: "challenges_completed", operator: ">=", value: 25 }, points: 100, isHidden: false, tier: 4, maxTier: 4,
  },

  // ── Goal Achievements ──
  {
    id: "goal_first", name: "Goal Getter", description: "Set your first goal",
    category: AchievementCategory.GOAL, rarity: AchievementRarity.COMMON, icon: "🎯",
    criteria: { type: "goals_completed", operator: ">=", value: 0 }, points: 10, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "goal_complete_1", name: "Goal Achiever", description: "Complete your first goal",
    category: AchievementCategory.GOAL, rarity: AchievementRarity.COMMON, icon: "✅",
    criteria: { type: "goals_completed", operator: ">=", value: 1 }, points: 10, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "goal_complete_5", name: "Goal Crusher", description: "Complete 5 goals",
    category: AchievementCategory.GOAL, rarity: AchievementRarity.UNCOMMON, icon: "💥",
    criteria: { type: "goals_completed", operator: ">=", value: 5 }, points: 25, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "goal_complete_10", name: "Goal Master", description: "Complete 10 goals",
    category: AchievementCategory.GOAL, rarity: AchievementRarity.RARE, icon: "🎖️",
    criteria: { type: "goals_completed", operator: ">=", value: 10 }, points: 50, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "goal_complete_25", name: "Goal Legend", description: "Complete 25 goals",
    category: AchievementCategory.GOAL, rarity: AchievementRarity.EPIC, icon: "🏆",
    criteria: { type: "goals_completed", operator: ">=", value: 25 }, points: 100, isHidden: false, tier: 4, maxTier: 4,
  },
  {
    id: "goal_complete_100", name: "Centurion Goalsetter", description: "Complete 100 goals",
    category: AchievementCategory.GOAL, rarity: AchievementRarity.LEGENDARY, icon: "👑",
    criteria: { type: "goals_completed", operator: ">=", value: 100 }, points: 250, isHidden: true, tier: 1, maxTier: 1,
  },

  // ── Body Composition Achievements ──
  {
    id: "weight_lost_5", name: "First Five", description: "Lose 5 kg",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.UNCOMMON, icon: "📉",
    criteria: { type: "weight_lost", operator: ">=", value: 5 }, points: 25, isHidden: false, tier: 1, maxTier: 5,
  },
  {
    id: "weight_lost_10", name: "Ten Down", description: "Lose 10 kg",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.RARE, icon: "🎯",
    criteria: { type: "weight_lost", operator: ">=", value: 10 }, points: 50, isHidden: false, tier: 2, maxTier: 5,
  },
  {
    id: "weight_lost_20", name: "Transformation", description: "Lose 20 kg",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.EPIC, icon: "🦋",
    criteria: { type: "weight_lost", operator: ">=", value: 20 }, points: 100, isHidden: false, tier: 3, maxTier: 5,
  },
  {
    id: "weight_lost_50", name: "Extreme Makeover", description: "Lose 50 kg",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.LEGENDARY, icon: "🌟",
    criteria: { type: "weight_lost", operator: ">=", value: 50 }, points: 250, isHidden: false, tier: 5, maxTier: 5,
  },
  {
    id: "muscle_gained_5", name: "Gains", description: "Gain 5 kg of muscle",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.UNCOMMON, icon: "💪",
    criteria: { type: "muscle_mass_gained", operator: ">=", value: 5 }, points: 25, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "muscle_gained_10", name: "Muscle Builder", description: "Gain 10 kg of muscle",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.RARE, icon: "🏋️",
    criteria: { type: "muscle_mass_gained", operator: ">=", value: 10 }, points: 50, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "muscle_gained_20", name: "Mass Monster", description: "Gain 20 kg of muscle",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.EPIC, icon: "🦍",
    criteria: { type: "muscle_mass_gained", operator: ">=", value: 20 }, points: 100, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "muscle_gained_30", name: "Muscle God", description: "Gain 30 kg of muscle",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.LEGENDARY, icon: "⚡",
    criteria: { type: "muscle_mass_gained", operator: ">=", value: 30 }, points: 250, isHidden: false, tier: 4, maxTier: 4,
  },
  {
    id: "body_fat_5", name: "Lean Machine", description: "Reduce body fat by 5%",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.RARE, icon: "📊",
    criteria: { type: "body_fat_reduced", operator: ">=", value: 5 }, points: 50, isHidden: false, tier: 1, maxTier: 3,
  },
  {
    id: "body_fat_10", name: "Shredded", description: "Reduce body fat by 10%",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.EPIC, icon: "🔥",
    criteria: { type: "body_fat_reduced", operator: ">=", value: 10 }, points: 100, isHidden: false, tier: 2, maxTier: 3,
  },
  {
    id: "body_fat_15", name: "Stage Ready", description: "Reduce body fat by 15%",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.LEGENDARY, icon: "🏆",
    criteria: { type: "body_fat_reduced", operator: ">=", value: 15 }, points: 250, isHidden: false, tier: 3, maxTier: 3,
  },

  // ── Steps Achievements ──
  {
    id: "steps_10000", name: "10K Steps", description: "Walk 10,000 steps in a day",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.COMMON, icon: "🚶",
    criteria: { type: "steps_total", operator: ">=", value: 10000 }, points: 10, isHidden: false, tier: 1, maxTier: 4,
  },
  {
    id: "steps_50000", name: "50K Steps", description: "Walk 50,000 total steps",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.UNCOMMON, icon: "👟",
    criteria: { type: "steps_total", operator: ">=", value: 50000 }, points: 25, isHidden: false, tier: 2, maxTier: 4,
  },
  {
    id: "steps_100000", name: "100K Steps", description: "Walk 100,000 total steps",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.RARE, icon: "🦿",
    criteria: { type: "steps_total", operator: ">=", value: 100000 }, points: 50, isHidden: false, tier: 3, maxTier: 4,
  },
  {
    id: "steps_1000000", name: "Million Steps", description: "Walk 1,000,000 total steps",
    category: AchievementCategory.WORKOUT, rarity: AchievementRarity.LEGENDARY, icon: "🌍",
    criteria: { type: "steps_total", operator: ">=", value: 1000000 }, points: 250, isHidden: false, tier: 4, maxTier: 4,
  },

  // ── Special / Hidden Achievements ──
  {
    id: "midnight_workout", name: "Midnight Warrior", description: "Complete a workout at midnight",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.EPIC, icon: "🌙",
    criteria: { type: "time_of_day", period: "night", count: 1 }, points: 100, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "christmas_workout", name: "Santa's Helper", description: "Work out on Christmas Day",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.EPIC, icon: "🎄",
    criteria: { type: "special_date", date: "12-25", achievement: "christmas_workout" }, points: 100, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "newyear_workout", name: "New Year's Resolution", description: "Work out on New Year's Day",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.EPIC, icon: "🎆",
    criteria: { type: "special_date", date: "01-01", achievement: "newyear_workout" }, points: 100, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "valentines_workout", name: "Love of Fitness", description: "Work out on Valentine's Day",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.RARE, icon: "❤️",
    criteria: { type: "special_date", date: "02-14", achievement: "valentines_workout" }, points: 50, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "halloween_workout", name: "Spooky Sweat", description: "Work out on Halloween",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.RARE, icon: "🎃",
    criteria: { type: "special_date", date: "10-31", achievement: "halloween_workout" }, points: 50, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "perfect_week", name: "Perfect Week", description: "Hit all nutrition and workout targets for an entire week",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.EPIC, icon: "✨",
    criteria: { type: "consecutive_weeks", operator: ">=", value: 1 }, points: 100, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "comeback_kid", name: "Comeback Kid", description: "Return to working out after a 30+ day break",
    category: AchievementCategory.SPECIAL, rarity: AchievementRarity.RARE, icon: "🔄",
    criteria: { type: "streak_days", operator: ">=", value: 1 }, points: 50, isHidden: true, tier: 1, maxTier: 1,
  },
  {
    id: "personal_record", name: "New PR!", description: "Set a new personal record",
    category: AchievementCategory.MILESTONE, rarity: AchievementRarity.UNCOMMON, icon: "🎯",
    criteria: { type: "personal_record", exercise: "any", operator: ">=", value: 1, unit: "kg" }, points: 25, isHidden: false, tier: 1, maxTier: 5,
  },
];

// ─── Validation Schemas ─────────────────────────────────────────────

export const createAchievementProgressSchema = z.object({
  userId: z.string().uuid(),
  achievementId: z.string(),
  progress: z.number().min(0),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Types ──────────────────────────────────────────────────────────

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  seenAt: string | null;
  tier: number;
  pointsEarned: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementWithProgress extends AchievementDefinition {
  userProgress: UserAchievement | null;
  currentProgress: number;
  maxProgress: number;
  percentage: number;
  isUnlocked: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  achievementCount: number;
  rank: number;
  rarityBreakdown: Record<AchievementRarity, number>;
  recentUnlocks: Array<{
    achievementId: string;
    name: string;
    icon: string;
    unlockedAt: string;
  }>;
}

export interface AchievementStats {
  totalPoints: number;
  totalUnlocked: number;
  totalAchievements: number;
  completionPercentage: number;
  rarityBreakdown: Record<AchievementRarity, { count: number; points: number }>;
  categoryBreakdown: Record<
    AchievementCategory,
    { unlocked: number; total: number }
  >;
  recentUnlocks: UserAchievement[];
  upcomingAchievements: AchievementWithProgress[];
}

// ─── Service ────────────────────────────────────────────────────────

export class AchievementService {
  private userAchievements: Map<string, Map<string, UserAchievement>> =
    new Map();
  private leaderboardCache: Map<string, LeaderboardEntry[]> = new Map();

  async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    return [...ACHIEVEMENT_DEFINITIONS];
  }

  async getAchievementById(
    achievementId: string
  ): Promise<AchievementDefinition | null> {
    return (
      ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId) ?? null
    );
  }

  async getUserAchievements(
    userId: string,
    options?: {
      category?: AchievementCategory;
      rarity?: AchievementRarity;
      unlockedOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    achievements: AchievementWithProgress[];
    total: number;
  }> {
    const userMap = this.userAchievements.get(userId) ?? new Map();

    let definitions = [...ACHIEVEMENT_DEFINITIONS];

    if (options?.category) {
      definitions = definitions.filter(
        (d) => d.category === options.category
      );
    }
    if (options?.rarity) {
      definitions = definitions.filter((d) => d.rarity === options.rarity);
    }

    let achievements: AchievementWithProgress[] = definitions.map((def) => {
      const userAch = userMap.get(def.id) ?? null;
      const currentProgress = userAch?.progress ?? 0;
      const maxProgress = this.getMaxProgress(def);
      const percentage =
        maxProgress > 0
          ? Math.min((currentProgress / maxProgress) * 100, 100)
          : 0;

      return {
        ...def,
        userProgress: userAch,
        currentProgress,
        maxProgress,
        percentage: Math.round(percentage * 100) / 100,
        isUnlocked: userAch?.unlocked ?? false,
      };
    });

    if (options?.unlockedOnly) {
      achievements = achievements.filter((a) => a.isUnlocked);
    }

    const total = achievements.length;

    achievements.sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return b.percentage - a.percentage;
    });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    achievements = achievements.slice(offset, offset + limit);

    return { achievements, total };
  }

  async trackProgress(
    userId: string,
    eventType: string,
    eventValue: number,
    metadata: Record<string, unknown> = {}
  ): Promise<UserAchievement[]> {
    const newlyUnlocked: UserAchievement[] = [];
    const userMap =
      this.userAchievements.get(userId) ?? new Map();

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const criteria = definition.criteria;
      let criteriaMet = false;

      if (criteria.type === eventType) {
        switch (criteria.operator) {
          case ">=":
            criteriaMet = eventValue >= criteria.value;
            break;
          case "==":
            criteriaMet = eventValue === criteria.value;
            break;
          case "<=":
            criteriaMet = eventValue <= criteria.value;
            break;
        }
      }

      if (!criteriaMet) continue;

      const existing = userMap.get(definition.id);
      const now = new Date().toISOString();

      if (existing?.unlocked) continue;

      const maxProgress = this.getMaxProgress(definition);
      const currentProgress = existing?.progress ?? 0;
      const newProgress = Math.min(currentProgress + eventValue, maxProgress);

      if (existing) {
        existing.progress = newProgress;
        existing.updatedAt = now;

        if (newProgress >= maxProgress && !existing.unlocked) {
          existing.unlocked = true;
          existing.unlockedAt = now;
          existing.pointsEarned = definition.points;
          newlyUnlocked.push(existing);
        }
      } else {
        const userAch: UserAchievement = {
          id: crypto.randomUUID(),
          userId,
          achievementId: definition.id,
          progress: Math.min(eventValue, maxProgress),
          maxProgress,
          unlocked: eventValue >= maxProgress,
          unlockedAt: eventValue >= maxProgress ? now : null,
          seenAt: null,
          tier: definition.tier,
          pointsEarned: eventValue >= maxProgress ? definition.points : 0,
          metadata,
          createdAt: now,
          updatedAt: now,
        };

        userMap.set(definition.id, userAch);

        if (userAch.unlocked) {
          newlyUnlocked.push(userAch);
        }
      }
    }

    this.userAchievements.set(userId, userMap);
    this.leaderboardCache.clear();

    return newlyUnlocked;
  }

  async unlockAchievement(
    userId: string,
    achievementId: string
  ): Promise<UserAchievement> {
    const definition = ACHIEVEMENT_DEFINITIONS.find(
      (a) => a.id === achievementId
    );
    if (!definition) throw new Error(`Achievement ${achievementId} not found`);

    const userMap =
      this.userAchievements.get(userId) ?? new Map();
    const now = new Date().toISOString();
    const maxProgress = this.getMaxProgress(definition);

    const existing = userMap.get(achievementId);

    if (existing?.unlocked) return existing;

    const userAch: UserAchievement = {
      id: existing?.id ?? crypto.randomUUID(),
      userId,
      achievementId,
      progress: maxProgress,
      maxProgress,
      unlocked: true,
      unlockedAt: now,
      seenAt: null,
      tier: definition.tier,
      pointsEarned: definition.points,
      metadata: existing?.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    userMap.set(achievementId, userAch);
    this.userAchievements.set(userId, userMap);
    this.leaderboardCache.clear();

    return userAch;
  }

  async markSeen(userId: string, achievementId: string): Promise<boolean> {
    const userMap = this.userAchievements.get(userId);
    if (!userMap) return false;

    const ach = userMap.get(achievementId);
    if (!ach) return false;

    ach.seenAt = new Date().toISOString();
    ach.updatedAt = new Date().toISOString();
    return true;
  }

  async getAchievementStats(userId: string): Promise<AchievementStats> {
    const userMap = this.userAchievements.get(userId) ?? new Map();
    const allDefs = [...ACHIEVEMENT_DEFINITIONS];

    let totalPoints = 0;
    let totalUnlocked = 0;

    const rarityBreakdown = Object.values(AchievementRarity).reduce(
      (acc, r) => {
        acc[r] = { count: 0, points: 0 };
        return acc;
      },
      {} as Record<AchievementRarity, { count: number; points: number }>
    );

    const categoryBreakdown = Object.values(AchievementCategory).reduce(
      (acc, c) => {
        acc[c] = { unlocked: 0, total: 0 };
        return acc;
      },
      {} as Record<AchievementCategory, { unlocked: number; total: number }>
    );

    const recentUnlocks: UserAchievement[] = [];

    for (const def of allDefs) {
      categoryBreakdown[def.category].total++;
      rarityBreakdown[def.rarity].count++;

      const userAch = userMap.get(def.id);
      if (userAch?.unlocked) {
        totalUnlocked++;
        totalPoints += userAch.pointsEarned;
        rarityBreakdown[def.rarity].points += userAch.pointsEarned;
        categoryBreakdown[def.category].unlocked++;

        if (userAch.unlockedAt) {
          recentUnlocks.push(userAch);
        }
      }
    }

    recentUnlocks.sort((a, b) => {
      if (!a.unlockedAt || !b.unlockedAt) return 0;
      return (
        new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
      );
    });

    const upcomingAchievements = allDefs
      .filter((def) => !userMap.get(def.id)?.unlocked)
      .map((def) => {
        const userAch = userMap.get(def.id) ?? null;
        const currentProgress = userAch?.progress ?? 0;
        const maxProgress = this.getMaxProgress(def);
        const percentage =
          maxProgress > 0
            ? Math.min((currentProgress / maxProgress) * 100, 100)
            : 0;

        return {
          ...def,
          userProgress: userAch,
          currentProgress,
          maxProgress,
          percentage: Math.round(percentage * 100) / 100,
          isUnlocked: false,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    return {
      totalPoints,
      totalUnlocked,
      totalAchievements: allDefs.length,
      completionPercentage:
        allDefs.length > 0
          ? Math.round((totalUnlocked / allDefs.length) * 10000) / 100
          : 0,
      rarityBreakdown,
      categoryBreakdown,
      recentUnlocks: recentUnlocks.slice(0, 10),
      upcomingAchievements,
    };
  }

  async getLeaderboard(
    options?: {
      limit?: number;
      offset?: number;
      category?: AchievementCategory;
    }
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `global_${options?.category ?? "all"}`;
    const cached = this.leaderboardCache.get(cacheKey);
    if (cached) return cached;

    const userStats: Map<
      string,
      {
        totalPoints: number;
        achievementCount: number;
        rarityBreakdown: Record<AchievementRarity, number>;
        recentUnlocks: Array<{
          achievementId: string;
          name: string;
          icon: string;
          unlockedAt: string;
        }>;
      }
    > = new Map();

    for (const [userId, userMap] of this.userAchievements) {
      let totalPoints = 0;
      let achievementCount = 0;
      const rarityBreakdown = Object.values(AchievementRarity).reduce(
        (acc, r) => {
          acc[r] = 0;
          return acc;
        },
        {} as Record<AchievementRarity, number>
      );
      const recentUnlocks: Array<{
        achievementId: string;
        name: string;
        icon: string;
        unlockedAt: string;
      }> = [];

      for (const [achId, userAch] of userMap) {
        if (!userAch.unlocked) continue;

        const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achId);
        if (!def) continue;

        if (options?.category && def.category !== options.category) continue;

        totalPoints += userAch.pointsEarned;
        achievementCount++;
        rarityBreakdown[def.rarity]++;

        if (userAch.unlockedAt) {
          recentUnlocks.push({
            achievementId: achId,
            name: def.name,
            icon: def.icon,
            unlockedAt: userAch.unlockedAt,
          });
        }
      }

      if (achievementCount > 0) {
        recentUnlocks.sort(
          (a, b) =>
            new Date(b.unlockedAt).getTime() -
            new Date(a.unlockedAt).getTime()
        );

        userStats.set(userId, {
          totalPoints,
          achievementCount,
          rarityBreakdown,
          recentUnlocks: recentUnlocks.slice(0, 5),
        });
      }
    }

    const entries: LeaderboardEntry[] = Array.from(userStats.entries())
      .map(([userId, stats], index) => ({
        userId,
        username: `user_${userId.slice(0, 8)}`,
        displayName: `User ${userId.slice(0, 8)}`,
        avatarUrl: null,
        ...stats,
        rank: 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    const result = entries.slice(offset, offset + limit);

    this.leaderboardCache.set(cacheKey, entries);
    return result;
  }

  async getUserRank(
    userId: string,
    category?: AchievementCategory
  ): Promise<{ rank: number; total: number; points: number } | null> {
    const leaderboard = await this.getLeaderboard({
      limit: Number.MAX_SAFE_INTEGER,
      category,
    });

    const entry = leaderboard.find((e) => e.userId === userId);
    if (!entry) return null;

    return {
      rank: entry.rank,
      total: leaderboard.length,
      points: entry.totalPoints,
    };
  }

  async checkAndAwardAchievements(
    userId: string
  ): Promise<UserAchievement[]> {
    const userMap = this.userAchievements.get(userId) ?? new Map();
    const newlyUnlocked: UserAchievement[] = [];

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      const existing = userMap.get(definition.id);
      if (existing?.unlocked) continue;

      const maxProgress = this.getMaxProgress(definition);
      const currentProgress = existing?.progress ?? 0;

      if (currentProgress >= maxProgress) {
        const now = new Date().toISOString();
        const userAch: UserAchievement = {
          id: existing?.id ?? crypto.randomUUID(),
          userId,
          achievementId: definition.id,
          progress: maxProgress,
          maxProgress,
          unlocked: true,
          unlockedAt: now,
          seenAt: null,
          tier: definition.tier,
          pointsEarned: definition.points,
          metadata: existing?.metadata ?? {},
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        userMap.set(definition.id, userAch);
        newlyUnlocked.push(userAch);
      }
    }

    if (newlyUnlocked.length > 0) {
      this.userAchievements.set(userId, userMap);
      this.leaderboardCache.clear();
    }

    return newlyUnlocked;
  }

  private getMaxProgress(definition: AchievementDefinition): number {
    const c = definition.criteria;
    if ("value" in c && typeof c.value === "number") {
      return c.value;
    }
    if ("count" in c && typeof c.count === "number") {
      return c.count;
    }
    return 1;
  }
}

export const achievementService = new AchievementService();
