export interface Workout {
  id: string;
  userId: string;
  name: string;
  type: WorkoutType;
  status: WorkoutStatus;
  startedAt: string;
  completedAt?: string;
  duration: number;
  exercises: WorkoutExercise[];
  notes?: string;
  caloriesBurned?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  isTemplate: boolean;
  templateId?: string;
  rating?: number;
  difficulty?: DifficultyLevel;
  createdAt: string;
  updatedAt: string;
}

export type WorkoutType =
  | "strength"
  | "cardio"
  | "flexibility"
  | "hiit"
  | "sports"
  | "custom";

export type WorkoutStatus =
  | "draft"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  sets: ExerciseSet[];
  notes?: string;
  restTime?: number;
  supersetId?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  category: ExerciseCategory;
  muscleGroup: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  type: ExerciseType;
  difficulty: DifficultyLevel;
  instructions: string[];
  tips: string[];
  videoUrl?: string;
  imageUrl?: string;
  isCustom: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExerciseCategory =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "glutes"
  | "full_body"
  | "cardio"
  | "stretching";

export type MuscleGroup =
  | "chest"
  | "upper_chest"
  | "lower_chest"
  | "back"
  | "upper_back"
  | "lower_back"
  | "lats"
  | "traps"
  | "shoulders"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "hamstrings"
  | "calves"
  | "glutes"
  | "hip_flexors"
  | "adductors"
  | "abductors";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "machine"
  | "cable"
  | "band"
  | "bodyweight"
  | "smith_machine"
  | "ez_bar"
  | "medicine_ball"
  | "foam_roller"
  | "pull_up_bar"
  | "dip_bar"
  | "bench"
  | "incline_bench"
  | "decline_bench"
  | "rack";

export type ExerciseType =
  | "strength"
  | "cardio"
  | "flexibility"
  | "balance"
  | "plyometric"
  | "isometric";

export interface ExerciseSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  type: SetType;
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  rpe?: number;
  pace?: string;
  heartRate?: number;
  completed: boolean;
  skipped: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SetType =
  | "normal"
  | "warmup"
  | "dropset"
  | "failure"
  | "superset"
  | "cluster"
  | "amrap";

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: WorkoutType;
  exercises: TemplateExercise[];
  isPublic: boolean;
  tags: string[];
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateExercise {
  exerciseId: string;
  exercise: Exercise;
  order: number;
  targetSets: number;
  targetReps?: number;
  targetWeight?: number;
  targetDuration?: number;
  restTime: number;
  notes?: string;
  supersetId?: string;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  averageDuration: number;
  averageCalories: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  personalRecords: PersonalRecord[];
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  type: "weight" | "reps" | "volume" | "duration";
  value: number;
  unit: string;
  achievedAt: string;
  workoutId: string;
}

export interface WorkoutFilters {
  type?: WorkoutType[];
  status?: WorkoutStatus[];
  dateFrom?: string;
  dateTo?: string;
  durationMin?: number;
  durationMax?: number;
  search?: string;
  sortBy?: "date" | "duration" | "calories";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
