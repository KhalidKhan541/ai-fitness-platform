export interface Meal {
  id: string;
  userId: string;
  name: string;
  type: MealType;
  date: string;
  time: string;
  foods: MealFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealFood {
  id: string;
  mealId: string;
  foodId: string;
  food: Food;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  createdAt: string;
  updatedAt: string;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
  saturatedFat: number;
  transFat: number;
  unsaturatedFat: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
  ingredients?: string;
  imageUrl?: string;
  isCustom: boolean;
  userId?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FoodCategory =
  | "grains"
  | "vegetables"
  | "fruits"
  | "protein"
  | "dairy"
  | "fats_oils"
  | "beverages"
  | "snacks"
  | "condiments"
  | "prepared_foods"
  | "fast_food"
  | "other";

export interface NutritionGoal {
  id: string;
  userId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyNutrition {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  waterIntake: number;
  goal: NutritionGoal;
  summary: NutritionSummary;
}

export interface NutritionSummary {
  calories: { consumed: number; goal: number; remaining: number; percentage: number };
  protein: { consumed: number; goal: number; remaining: number; percentage: number };
  carbs: { consumed: number; goal: number; remaining: number; percentage: number };
  fat: { consumed: number; goal: number; remaining: number; percentage: number };
  fiber: { consumed: number; goal: number; remaining: number; percentage: number };
}

export interface WaterIntake {
  id: string;
  userId: string;
  amount: number;
  unit: "ml" | "oz" | "cups";
  date: string;
  time: string;
  createdAt: string;
}

export interface NutritionStats {
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  averageFiber: number;
  totalMeals: number;
  streakDays: number;
  topFoods: Array<{ foodId: string; name: string; count: number }>;
  macroDistribution: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface FoodSearchResult {
  foods: Food[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FoodLogEntry {
  date: string;
  meals: Meal[];
  summary: NutritionSummary;
}

export interface NutritionFilters {
  dateFrom?: string;
  dateTo?: string;
  mealType?: MealType[];
  search?: string;
  sortBy?: "date" | "calories" | "name";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}
