export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  unit: "kg" | "lbs";
  date: string;
  time: string;
  bodyFat?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementEntry {
  id: string;
  userId: string;
  date: string;
  time: string;
  chest?: number;
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  shoulders?: number;
  unit: "cm" | "in";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string;
  type: PhotoType;
  angle: PhotoAngle;
  date: string;
  weight?: number;
  bodyFat?: number;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type PhotoType = "front" | "back" | "side" | "progress";
export type PhotoAngle = "front" | "back" | "left_side" | "right_side" | "quarter";

export interface ProgressEntry {
  id: string;
  userId: string;
  type: ProgressType;
  date: string;
  value: number;
  unit: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProgressType =
  | "weight"
  | "body_fat"
  | "chest"
  | "waist"
  | "hips"
  | "arms"
  | "thighs"
  | "calves"
  | "shoulders";

export interface ProgressStats {
  currentWeight: number;
  startingWeight: number;
  weightChange: number;
  weightChangePercentage: number;
  averageWeeklyChange: number;
  lowestWeight: number;
  highestWeight: number;
  totalEntries: number;
  streakDays: number;
}

export interface WeightGoal {
  current: number;
  target: number;
  startWeight: number;
  unit: "kg" | "lbs";
  startDate: string;
  targetDate: string;
  progress: number;
  weeklyRate: number;
  estimatedDate: string;
}

export interface BodyComposition {
  weight: number;
  bodyFat: number;
  leanBodyMass: number;
  bmi: number;
  bmiCategory: string;
  date: string;
}

export interface ProgressChart {
  type: ProgressType;
  data: Array<{
    date: string;
    value: number;
    unit: string;
  }>;
  statistics: {
    min: number;
    max: number;
    average: number;
    trend: "up" | "down" | "stable";
    change: number;
  };
}

export interface ProgressFilters {
  type?: ProgressType[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "value";
  sortOrder?: "asc" | "desc";
}

export interface PhotoComparison {
  before: ProgressPhoto;
  after: ProgressPhoto;
  timeDiff: number;
  weightDiff?: number;
  bodyFatDiff?: number;
}

export interface ProgressMilestone {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  achieved: boolean;
  achievedAt?: string;
  createdAt: string;
}
