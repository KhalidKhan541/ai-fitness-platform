export interface BodyMetrics {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  unit: "metric" | "imperial";
}

export interface BmiResult {
  value: number;
  category: "underweight" | "normal" | "overweight" | "obese";
  label: string;
  color: string;
}

export interface BmrResult {
  value: number;
  unit: "kcal/day";
  formula: string;
}

export interface TdeeResult {
  value: number;
  unit: "kcal/day";
  activityLevel: string;
  multiplier: number;
}

export interface MacroResult {
  calories: number;
  protein: { grams: number; percentage: number; calories: number };
  carbs: { grams: number; percentage: number; calories: number };
  fat: { grams: number; percentage: number; calories: number };
}

export interface OneRepMaxResult {
  value: number;
  percentage: number;
  repMax: number;
}

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Lightly Active (light exercise 1-3 days/week)",
  moderate: "Moderately Active (moderate exercise 3-5 days/week)",
  active: "Active (hard exercise 6-7 days/week)",
  very_active: "Very Active (very hard exercise & physical job)",
};

function toKg(lbs: number): number {
  return lbs * 0.453592;
}

function toCm(inches: number): number {
  return inches * 2.54;
}

export function calculateBMI(
  weight: number,
  height: number,
  unit: "metric" | "imperial" = "metric"
): BmiResult {
  let bmi: number;

  if (unit === "imperial") {
    const weightKg = toKg(weight);
    const heightCm = toCm(height);
    bmi = weightKg / (heightCm / 100) ** 2;
  } else {
    bmi = weight / (height / 100) ** 2;
  }

  let category: BmiResult["category"];
  let label: string;
  let color: string;

  if (bmi < 18.5) {
    category = "underweight";
    label = "Underweight";
    color = "text-blue-500";
  } else if (bmi < 25) {
    category = "normal";
    label = "Normal";
    color = "text-green-500";
  } else if (bmi < 30) {
    category = "overweight";
    label = "Overweight";
    color = "text-yellow-500";
  } else {
    category = "obese";
    label = "Obese";
    color = "text-red-500";
  }

  return { value: Math.round(bmi * 10) / 10, category, label, color };
}

export function calculateBMR(metrics: BodyMetrics): BmrResult {
  let weightKg: number;
  let heightCm: number;

  if (metrics.unit === "imperial") {
    weightKg = toKg(metrics.weight);
    heightCm = toCm(metrics.height);
  } else {
    weightKg = metrics.weight;
    heightCm = metrics.height;
  }

  let bmr: number;

  if (metrics.gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * metrics.age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * metrics.age - 161;
  }

  return {
    value: Math.round(bmr),
    unit: "kcal/day",
    formula: "Mifflin-St Jeor",
  };
}

export function calculateTDEE(
  metrics: BodyMetrics,
  activityLevel: ActivityLevel = "moderate"
): TdeeResult {
  const bmr = calculateBMR(metrics);
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];

  return {
    value: Math.round(bmr.value * multiplier),
    unit: "kcal/day",
    activityLevel: ACTIVITY_LABELS[activityLevel],
    multiplier,
  };
}

export function calculateMacros(
  tdee: number,
  goal: "lose" | "maintain" | "gain" = "maintain",
  bodyWeightKg: number
): MacroResult {
  let targetCalories: number;

  switch (goal) {
    case "lose":
      targetCalories = tdee - 500;
      break;
    case "gain":
      targetCalories = tdee + 300;
      break;
    default:
      targetCalories = tdee;
  }

  const proteinPerKg = goal === "lose" ? 2.2 : 1.8;
  const proteinGrams = Math.round(bodyWeightKg * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  const fatPercentage = 0.25;
  const fatCalories = Math.round(targetCalories * fatPercentage);
  const fatGrams = Math.round(fatCalories / 9);

  const carbsCalories = targetCalories - proteinCalories - fatCalories;
  const carbsGrams = Math.round(carbsCalories / 4);

  return {
    calories: Math.round(targetCalories),
    protein: {
      grams: proteinGrams,
      percentage: Math.round((proteinCalories / targetCalories) * 100),
      calories: proteinCalories,
    },
    carbs: {
      grams: carbsGrams,
      percentage: Math.round((carbsCalories / targetCalories) * 100),
      calories: carbsCalories,
    },
    fat: {
      grams: fatGrams,
      percentage: Math.round(fatPercentage * 100),
      calories: fatCalories,
    },
  };
}

export function calculateOneRepMax(
  weight: number,
  reps: number
): OneRepMaxResult {
  if (reps === 1) {
    return { value: weight, percentage: 100, repMax: 1 };
  }

  const orm = weight * (1 + reps / 30);

  return {
    value: Math.round(orm * 10) / 10,
    percentage: Math.round((weight / orm) * 100),
    repMax: reps,
  };
}

export function calculateRepMax(
  oneRepMax: number,
  reps: number
): number {
  if (reps === 1) return oneRepMax;
  return Math.round((oneRepMax / (1 + reps / 30)) * 10) / 10;
}

export function getRepMaxTable(oneRepMax: number): Array<{ reps: number; weight: number; percentage: number }> {
  const table: Array<{ reps: number; weight: number; percentage: number }> = [];
  const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20];

  for (const pct of percentages) {
    const weight = Math.round((oneRepMax * pct) / 100 * 2) / 2;
    const reps = Math.round(30 * (oneRepMax / weight - 1));
    table.push({
      reps: Math.max(1, Math.min(reps, 30)),
      weight,
      percentage: pct,
    });
  }

  return table;
}

export function calculatePace(
  distance: number,
  durationSeconds: number,
  unit: "km" | "mi" = "km"
): string {
  const paceSeconds = durationSeconds / distance;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")} /${unit}`;
}

export function calculateSpeed(
  distance: number,
  durationSeconds: number,
  unit: "km" | "mi" = "km"
): number {
  const hours = durationSeconds / 3600;
  return Math.round((distance / hours) * 100) / 100;
}

export function calculateCaloriesBurned(
  exercise: string,
  durationMinutes: number,
  weightKg: number,
  intensity: "low" | "medium" | "high" = "medium"
): number {
  const metValues: Record<string, Record<string, number>> = {
    running: { low: 8.3, medium: 11.5, high: 14.5 },
    cycling: { low: 6.8, medium: 10.0, high: 12.5 },
    swimming: { low: 5.8, medium: 8.3, high: 11.0 },
    weightlifting: { low: 3.5, medium: 5.0, high: 6.0 },
    yoga: { low: 2.5, medium: 3.5, high: 4.5 },
    walking: { low: 2.8, medium: 3.5, high: 4.5 },
    hiking: { low: 4.0, medium: 6.0, high: 8.0 },
    rowing: { low: 4.8, medium: 7.0, high: 12.0 },
    jumping_rope: { low: 8.8, medium: 12.3, high: 16.0 },
    elliptical: { low: 4.0, medium: 5.0, high: 7.0 },
  };

  const met = metValues[exercise]?.[intensity] || 5.0;
  return Math.round((met * weightKg * durationMinutes) / 60);
}

export function getBMICategory(bmi: number): string {
  if (bmi < 16) return "Severe Thinness";
  if (bmi < 17) return "Moderate Thinness";
  if (bmi < 18.5) return "Mild Thinness";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese Class I";
  if (bmi < 40) return "Obese Class II";
  return "Obese Class III";
}

export function calculateIdealWeightRange(
  height: number,
  gender: "male" | "female",
  unit: "metric" | "imperial" = "metric"
): { min: number; max: number; unit: string } {
  const heightCm = unit === "imperial" ? toCm(height) : height;
  const heightM = heightCm / 100;

  const bmiMin = 18.5;
  const bmiMax = 24.9;

  const minKg = Math.round(bmiMin * heightM ** 2 * 10) / 10;
  const maxKg = Math.round(bmiMax * heightM ** 2 * 10) / 10;

  if (unit === "imperial") {
    return {
      min: Math.round(minKg * 2.20462),
      max: Math.round(maxKg * 2.20462),
      unit: "lbs",
    };
  }

  return { min: minKg, max: maxKg, unit: "kg" };
}

export function calculateBodyFat(
  weight: number,
  height: number,
  age: number,
  gender: "male" | "female",
  waist?: number,
  neck?: number,
  unit: "metric" | "imperial" = "metric"
): number | null {
  if (!waist || !neck) return null;

  let weightKg = weight;
  let heightCm = height;
  let waistCm = waist;
  let neckCm = neck;

  if (unit === "imperial") {
    weightKg = toKg(weight);
    heightCm = toCm(height);
    waistCm = toCm(waist);
    neckCm = toCm(neck);
  }

  if (gender === "male") {
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
    return Math.round(bf * 10) / 10;
  } else {
    const bf = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + 0) + 0.22100 * Math.log10(heightCm)) - 450;
    return Math.round(bf * 10) / 10;
  }
}

export function calculateLeanBodyMass(
  weight: number,
  bodyFatPercentage: number,
  unit: "metric" | "imperial" = "metric"
): number {
  const weightKg = unit === "imperial" ? toKg(weight) : weight;
  const leanMass = weightKg * (1 - bodyFatPercentage / 100);
  return Math.round(leanMass * 10) / 10;
}

export function getProteinRecommendation(
  goal: "lose" | "maintain" | "gain" | "muscle",
  weightKg: number
): { min: number; max: number; unit: string } {
  const ranges: Record<string, { min: number; max: number }> = {
    lose: { min: 1.6, max: 2.4 },
    maintain: { min: 1.2, max: 1.6 },
    gain: { min: 1.6, max: 2.2 },
    muscle: { min: 1.8, max: 2.6 },
  };

  const range = ranges[goal] || ranges.maintain;
  return {
    min: Math.round(weightKg * range.min),
    max: Math.round(weightKg * range.max),
    unit: "g/day",
  };
}
