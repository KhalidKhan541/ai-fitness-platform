export { workoutService, WorkoutService } from './workout-service';
export type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  CreateExerciseInput,
  WorkoutSession,
  CompletedSet,
  PersonalRecord,
  WorkoutCategory,
  DifficultyLevel,
  WeightUnit,
  DistanceUnit,
  WorkoutSearchFilters,
  WorkoutStats,
} from './workout-service';

export { exerciseService, ExerciseService } from './exercise-service';
export type {
  CreateExerciseInput as CreateExerciseDefinitionInput,
  UpdateExerciseInput,
  ExerciseCategory,
  Equipment,
  ExerciseSearchFilters,
  ExerciseStats,
} from './exercise-service';

export { trackingService, TrackingService } from './tracking-service';
export type {
  StartWorkoutInput,
  LogSetInput,
  RestTimer,
  SupersetGroup,
  CircuitGroup,
  WorkoutSessionWithDetails,
  ActiveWorkout,
  ActiveExercise,
  PersonalRecordWithDetails,
} from './tracking-service';

export { progressService, ProgressService } from './progress-service';
export type {
  VolumeProgression,
  StrengthProgression,
  EnduranceProgression,
  BodyComposition,
  ProgressChartData,
  MuscleGroupVolume,
  ProgressSummary,
  StrengthGain,
  BodyCompositionChange,
} from './progress-service';

export { templateService, TemplateService } from './template-service';
export type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateExerciseInput,
  WeekProgression,
  TemplateSchedule,
  TemplateWithExercises,
  TemplateCategory,
  TemplateSearchFilters,
  PrebuiltTemplate,
  PrebuiltExercise,
  SharedTemplate,
} from './template-service';

export { nutritionService, NutritionService } from './nutrition-service';
export type {
  LogMealInput,
  CreateCustomFoodInput,
  NutritionGoals,
  DailyNutrition,
  NutritionTotals,
  MacroPercentages,
  FoodSearchResult,
  NutritionSummary,
  MealType,
  FoodCategory,
} from './nutrition-service';

export { mealPlannerService, MealPlannerService } from './meal-planner';
export type {
  CreateMealPlanInput,
  MealPlanDayInput,
  MealPlanMealInput,
  MealPlanFoodInput,
  WeeklyMealPlan,
  NutritionTargets,
  MealPlanDay,
  MealPlanMeal,
  MealPlanEntryWithFood,
  ShoppingListItem,
  MealTemplate,
  RecipeSuggestion,
  MealPlanSearchFilters,
} from './meal-planner';

export { waterTrackerService, WaterTrackerService } from './water-tracker';
export type {
  LogWaterInput,
  WaterGoal,
  DailyWaterIntake,
  WaterStreak,
  WaterStats,
  WaterReminder,
  WaterType,
} from './water-tracker';

export { sleepService, SleepService } from './sleep-service';
export type {
  LogSleepInput,
  SleepEnvironment,
  SleepStageData,
  SleepQuality,
  SleepAnalysis,
  SleepFactor,
  SleepRecommendation,
  SleepTrend,
  SleepSummary,
} from './sleep-service';

export { bodyService, BodyService } from './body-service';
export type {
  LogWeightInput,
  LogBodyFatInput,
  LogMeasurementsInput,
  UploadProgressPhotoInput,
  PhotoAngle,
  BodyComposition,
  MeasurementProgress,
  BodyStats,
  BodyFatCategory,
  WeightGoal,
  ProgressPhotoComparison,
} from './body-service';