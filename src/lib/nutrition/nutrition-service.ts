import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, FoodEntry, Food, Prisma } from '@prisma/client';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';

const prisma = new PrismaClient();

export interface LogMealInput {
  foodId?: string;
  customFoodName?: string;
  mealType: MealType;
  servings: number;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  notes?: string;
  barcode?: string;
}

export interface CreateCustomFoodInput {
  name: string;
  brand?: string;
  category: FoodCategory;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  barcode?: string;
  imageUrl?: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  water?: number;
}

export interface DailyNutrition {
  date: string;
  meals: FoodEntry[];
  totals: NutritionTotals;
  goals: NutritionGoals;
  remaining: NutritionTotals;
  macroPercentages: MacroPercentages;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface MacroPercentages {
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
  isCustom: boolean;
}

export interface NutritionSummary {
  period: string;
  averageDailyCalories: number;
  averageDailyProtein: number;
  averageDailyCarbs: number;
  averageDailyFat: number;
  totalMealsLogged: number;
  consistency: number;
  topFoods: { food: string; count: number }[];
  macroTrend: { date: string; protein: number; carbs: number; fat: number }[];
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export type FoodCategory =
  | 'PROTEIN'
  | 'CARBS'
  | 'FATS'
  | 'DAIRY'
  | 'FRUITS'
  | 'VEGETABLES'
  | 'GRAINS'
  | 'BEVERAGES'
  | 'SNACKS'
  | 'FAST_FOOD'
  | 'CONDIMENTS'
  | 'SUPPLEMENTS'
  | 'OTHER';

export class NutritionService {
  private readonly FOOD_DATABASE: Omit<CreateCustomFoodInput, 'barcode' | 'imageUrl'>[] = [
    // PROTEINS
    { name: 'Chicken Breast', brand: 'USDA', category: 'PROTEIN', servingSize: 100, servingUnit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 },
    { name: 'Salmon Fillet', brand: 'USDA', category: 'PROTEIN', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fat: 13, sodium: 59 },
    { name: 'Lean Ground Beef', brand: 'USDA', category: 'PROTEIN', servingSize: 100, servingUnit: 'g', calories: 250, protein: 26, carbs: 0, fat: 15, sodium: 75 },
    { name: 'Turkey Breast', brand: 'USDA', category: 'PROTEIN', servingSize: 100, servingUnit: 'g', calories: 135, protein: 30, carbs: 0, fat: 1, sodium: 46 },
    { name: 'Eggs', brand: 'USDA', category: 'PROTEIN', servingSize: 50, servingUnit: 'g', calories: 72, protein: 6, carbs: 0.4, fat: 5, sodium: 71 },
    { name: 'Greek Yogurt', brand: 'USDA', category: 'DAIRY', servingSize: 170, servingUnit: 'g', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sodium: 68 },
    { name: 'Cottage Cheese', brand: 'USDA', category: 'DAIRY', servingSize: 113, servingUnit: 'g', calories: 110, protein: 14, carbs: 5, fat: 4.3, sodium: 390 },
    { name: 'Tuna (canned)', brand: 'USDA', category: 'PROTEIN', servingSize: 85, servingUnit: 'g', calories: 100, protein: 22, carbs: 0, fat: 0.5, sodium: 300 },
    { name: 'Shrimp', brand: 'USDA', category: 'PROTEIN', servingSize: 100, servingUnit: 'g', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, sodium: 111 },
    { name: 'Pork Loin', brand: 'USDA', category: 'PROTEIN', servingSize: 100, servingUnit: 'g', calories: 143, protein: 26, carbs: 0, fat: 3.5, sodium: 48 },

    // CARBS
    { name: 'White Rice', brand: 'USDA', category: 'CARBS', servingSize: 158, servingUnit: 'g', calories: 206, protein: 4.4, carbs: 45, fat: 0.4, fiber: 0.6, sodium: 2 },
    { name: 'Brown Rice', brand: 'USDA', category: 'CARBS', servingSize: 195, servingUnit: 'g', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sodium: 10 },
    { name: 'Oatmeal', brand: 'USDA', category: 'GRAINS', servingSize: 234, servingUnit: 'g', calories: 150, protein: 5, carbs: 27, fat: 2.5, fiber: 4, sodium: 0 },
    { name: 'Sweet Potato', brand: 'USDA', category: 'CARBS', servingSize: 130, servingUnit: 'g', calories: 112, protein: 2, carbs: 26, fat: 0.1, fiber: 3.8, sodium: 41 },
    { name: 'Whole Wheat Bread', brand: 'USDA', category: 'GRAINS', servingSize: 28, servingUnit: 'g', calories: 69, protein: 3.6, carbs: 12, fat: 1, fiber: 1.9, sodium: 132 },
    { name: 'Quinoa', brand: 'USDA', category: 'GRAINS', servingSize: 185, servingUnit: 'g', calories: 222, protein: 8, carbs: 39, fat: 3.5, fiber: 5, sodium: 13 },
    { name: 'Pasta (cooked)', brand: 'USDA', category: 'GRAINS', servingSize: 140, servingUnit: 'g', calories: 220, protein: 8, carbs: 43, fat: 1.3, fiber: 2.5, sodium: 1 },
    { name: 'Banana', brand: 'USDA', category: 'FRUITS', servingSize: 118, servingUnit: 'g', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sodium: 1 },
    { name: 'Apple', brand: 'USDA', category: 'FRUITS', servingSize: 182, servingUnit: 'g', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sodium: 2 },
    { name: 'Orange', brand: 'USDA', category: 'FRUITS', servingSize: 131, servingUnit: 'g', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sodium: 0 },

    // FATS
    { name: 'Almonds', brand: 'USDA', category: 'FATS', servingSize: 28, servingUnit: 'g', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sodium: 0 },
    { name: 'Peanut Butter', brand: 'USDA', category: 'FATS', servingSize: 32, servingUnit: 'g', calories: 190, protein: 8, carbs: 7, fat: 16, fiber: 2, sodium: 136 },
    { name: 'Avocado', brand: 'USDA', category: 'FATS', servingSize: 150, servingUnit: 'g', calories: 240, protein: 3, carbs: 13, fat: 22, fiber: 10, sodium: 11 },
    { name: 'Olive Oil', brand: 'USDA', category: 'FATS', servingSize: 14, servingUnit: 'ml', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0, sodium: 0 },
    { name: 'Coconut Oil', brand: 'USDA', category: 'FATS', servingSize: 14, servingUnit: 'ml', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0, sodium: 0 },

    // DAIRY
    { name: 'Whole Milk', brand: 'USDA', category: 'DAIRY', servingSize: 244, servingUnit: 'ml', calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, sodium: 105 },
    { name: 'Skim Milk', brand: 'USDA', category: 'DAIRY', servingSize: 245, servingUnit: 'ml', calories: 83, protein: 8, carbs: 12, fat: 0.2, fiber: 0, sodium: 103 },
    { name: 'Cheddar Cheese', brand: 'USDA', category: 'DAIRY', servingSize: 28, servingUnit: 'g', calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0, sodium: 176 },
    { name: 'Mozzarella Cheese', brand: 'USDA', category: 'DAIRY', servingSize: 28, servingUnit: 'g', calories: 85, protein: 6, carbs: 0.7, fat: 6, fiber: 0, sodium: 138 },

    // VEGETABLES
    { name: 'Broccoli', brand: 'USDA', category: 'VEGETABLES', servingSize: 91, servingUnit: 'g', calories: 31, protein: 2.5, carbs: 6, fat: 0.3, fiber: 2.4, sodium: 30 },
    { name: 'Spinach', brand: 'USDA', category: 'VEGETABLES', servingSize: 30, servingUnit: 'g', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fiber: 0.7, sodium: 24 },
    { name: 'Bell Pepper', brand: 'USDA', category: 'VEGETABLES', servingSize: 119, servingUnit: 'g', calories: 30, protein: 1, carbs: 7, fat: 0.3, fiber: 2.1, sodium: 4 },
    { name: 'Carrots', brand: 'USDA', category: 'VEGETABLES', servingSize: 61, servingUnit: 'g', calories: 25, protein: 0.6, carbs: 6, fat: 0.1, fiber: 1.7, sodium: 42 },
    { name: 'Tomatoes', brand: 'USDA', category: 'VEGETABLES', servingSize: 123, servingUnit: 'g', calories: 22, protein: 1, carbs: 5, fat: 0.2, fiber: 1.5, sodium: 6 },
    { name: 'Cucumber', brand: 'USDA', category: 'VEGETABLES', servingSize: 119, servingUnit: 'g', calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sodium: 2 },

    // SUPPLEMENTS
    { name: 'Whey Protein Powder', brand: 'Generic', category: 'SUPPLEMENTS', servingSize: 30, servingUnit: 'g', calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, sodium: 130 },
    { name: 'Casein Protein Powder', brand: 'Generic', category: 'SUPPLEMENTS', servingSize: 33, servingUnit: 'g', calories: 120, protein: 24, carbs: 3, fat: 1, fiber: 0, sodium: 100 },
    { name: 'Creatine Monohydrate', brand: 'Generic', category: 'SUPPLEMENTS', servingSize: 5, servingUnit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 },
    { name: 'BCAA Powder', brand: 'Generic', category: 'SUPPLEMENTS', servingSize: 10, servingUnit: 'g', calories: 10, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 },

    // BEVERAGES
    { name: 'Black Coffee', brand: 'Generic', category: 'BEVERAGES', servingSize: 240, servingUnit: 'ml', calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sodium: 5 },
    { name: 'Green Tea', brand: 'Generic', category: 'BEVERAGES', servingSize: 240, servingUnit: 'ml', calories: 2, protein: 0.5, carbs: 0, fat: 0, fiber: 0, sodium: 2 },
    { name: 'Orange Juice', brand: 'USDA', category: 'BEVERAGES', servingSize: 248, servingUnit: 'ml', calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5, sodium: 2 },
    { name: 'Cola (soda)', brand: 'Generic', category: 'BEVERAGES', servingSize: 355, servingUnit: 'ml', calories: 140, protein: 0, carbs: 39, fat: 0, fiber: 0, sodium: 45 },

    // SNACKS
    { name: 'Protein Bar', brand: 'Generic', category: 'SNACKS', servingSize: 60, servingUnit: 'g', calories: 230, protein: 20, carbs: 22, fat: 8, fiber: 3, sodium: 160 },
    { name: 'Trail Mix', brand: 'Generic', category: 'SNACKS', servingSize: 40, servingUnit: 'g', calories: 190, protein: 5, carbs: 16, fat: 13, fiber: 2, sodium: 50 },
    { name: 'Rice Cakes', brand: 'Generic', category: 'SNACKS', servingSize: 9, servingUnit: 'g', calories: 35, protein: 0.7, carbs: 7, fat: 0.3, fiber: 0.4, sodium: 29 },
    { name: 'Dark Chocolate', brand: 'Generic', category: 'SNACKS', servingSize: 28, servingUnit: 'g', calories: 170, protein: 2, carbs: 13, fat: 12, fiber: 3, sodium: 6 },
  ];

  async initializeFoodDatabase(): Promise<void> {
    const count = await prisma.food.count();
    if (count > 0) return;

    const foods = this.FOOD_DATABASE.map(food => ({
      id: uuidv4(),
      ...food,
      isCustom: false,
      createdBy: 'SYSTEM',
    }));

    await prisma.food.createMany({ data: foods });
  }

  async logMeal(userId: string, input: LogMealInput): Promise<FoodEntry> {
    return prisma.foodEntry.create({
      data: {
        id: uuidv4(),
        userId,
        foodId: input.foodId,
        customFoodName: input.customFoodName,
        mealType: input.mealType,
        servings: input.servings,
        servingSize: input.servingSize,
        servingUnit: input.servingUnit,
        calories: input.calories * input.servings,
        protein: input.protein * input.servings,
        carbs: input.carbs * input.servings,
        fat: input.fat * input.servings,
        fiber: (input.fiber || 0) * input.servings,
        sugar: (input.sugar || 0) * input.servings,
        sodium: (input.sodium || 0) * input.servings,
        cholesterol: (input.cholesterol || 0) * input.servings,
        notes: input.notes,
        barcode: input.barcode,
        loggedAt: new Date(),
      },
      include: {
        food: true,
      },
    });
  }

  async logMealByBarcode(userId: string, barcode: string, mealType: MealType, servings: number): Promise<FoodEntry> {
    const food = await prisma.food.findFirst({
      where: { barcode },
    });

    if (!food) {
      throw new Error('Food not found for barcode');
    }

    return this.logMeal(userId, {
      foodId: food.id,
      mealType,
      servings,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sugar: food.sugar,
      sodium: food.sodium,
      cholesterol: food.cholesterol,
      barcode,
    });
  }

  async getDailyNutrition(userId: string, date: Date): Promise<DailyNutrition> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const meals = await prisma.foodEntry.findMany({
      where: {
        userId,
        loggedAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: { food: true },
      orderBy: { loggedAt: 'asc' },
    });

    const totals = this.calculateTotals(meals);
    const goals = await this.getNutritionGoals(userId);
    const remaining = this.calculateRemaining(totals, goals);
    const macroPercentages = this.calculateMacroPercentages(totals);

    return {
      date: format(date, 'yyyy-MM-dd'),
      meals,
      totals,
      goals,
      remaining,
      macroPercentages,
    };
  }

  async getMealsByType(userId: string, date: Date, mealType: MealType): Promise<FoodEntry[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return prisma.foodEntry.findMany({
      where: {
        userId,
        mealType,
        loggedAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: { food: true },
      orderBy: { loggedAt: 'asc' },
    });
  }

  async updateMeal(mealId: string, input: Partial<LogMealInput>): Promise<FoodEntry> {
    const existing = await prisma.foodEntry.findUnique({ where: { id: mealId } });
    if (!existing) throw new Error('Meal not found');

    const updateData: any = {};

    if (input.servings !== undefined) updateData.servings = input.servings;
    if (input.mealType) updateData.mealType = input.mealType;
    if (input.notes !== undefined) updateData.notes = input.notes;

    if (input.calories !== undefined || input.servings !== undefined) {
      const servings = input.servings || existing.servings;
      updateData.calories = (input.calories || existing.calories / existing.servings) * servings;
      updateData.protein = (input.protein || existing.protein / existing.servings) * servings;
      updateData.carbs = (input.carbs || existing.carbs / existing.servings) * servings;
      updateData.fat = (input.fat || existing.fat / existing.servings) * servings;
    }

    return prisma.foodEntry.update({
      where: { id: mealId },
      data: updateData,
      include: { food: true },
    });
  }

  async deleteMeal(mealId: string): Promise<void> {
    await prisma.foodEntry.delete({ where: { id: mealId } });
  }

  async searchFoods(
    query: string,
    category?: FoodCategory,
    isCustom?: boolean
  ): Promise<FoodSearchResult[]> {
    const where: Prisma.FoodWhereInput = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isCustom !== undefined) {
      where.isCustom = isCustom;
    }

    const foods = await prisma.food.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    });

    return foods.map(food => ({
      id: food.id,
      name: food.name,
      brand: food.brand || undefined,
      category: food.category,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      barcode: food.barcode || undefined,
      isCustom: food.isCustom,
    }));
  }

  async getFoodByBarcode(barcode: string): Promise<FoodSearchResult | null> {
    const food = await prisma.food.findFirst({
      where: { barcode },
    });

    if (!food) return null;

    return {
      id: food.id,
      name: food.name,
      brand: food.brand || undefined,
      category: food.category,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      barcode: food.barcode || undefined,
      isCustom: food.isCustom,
    };
  }

  async createCustomFood(userId: string, input: CreateCustomFoodInput): Promise<Food> {
    return prisma.food.create({
      data: {
        id: uuidv4(),
        name: input.name,
        brand: input.brand,
        category: input.category,
        servingSize: input.servingSize,
        servingUnit: input.servingUnit,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        fiber: input.fiber,
        sugar: input.sugar,
        sodium: input.sodium,
        cholesterol: input.cholesterol,
        barcode: input.barcode,
        imageUrl: input.imageUrl,
        isCustom: true,
        createdBy: userId,
      },
    });
  }

  async updateCustomFood(foodId: string, input: Partial<CreateCustomFoodInput>): Promise<Food> {
    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) throw new Error('Food not found');
    if (!food.isCustom) throw new Error('Cannot edit system foods');

    return prisma.food.update({
      where: { id: foodId },
      data: input,
    });
  }

  async deleteCustomFood(foodId: string): Promise<void> {
    const food = await prisma.food.findUnique({ where: { id: foodId } });
    if (!food) throw new Error('Food not found');
    if (!food.isCustom) throw new Error('Cannot delete system foods');

    await prisma.food.delete({ where: { id: foodId } });
  }

  async getNutritionGoals(userId: string): Promise<NutritionGoals> {
    const goals = await prisma.nutritionGoal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!goals) {
      return {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 30,
        water: 2500,
      };
    }

    return {
      calories: goals.calories,
      protein: goals.protein,
      carbs: goals.carbs,
      fat: goals.fat,
      fiber: goals.fiber || undefined,
      water: goals.water || undefined,
    };
  }

  async setNutritionGoals(userId: string, goals: NutritionGoals): Promise<void> {
    const existing = await prisma.nutritionGoal.findFirst({
      where: { userId },
    });

    if (existing) {
      await prisma.nutritionGoal.update({
        where: { id: existing.id },
        data: goals,
      });
    } else {
      await prisma.nutritionGoal.create({
        data: {
          id: uuidv4(),
          userId,
          ...goals,
        },
      });
    }
  }

  async calculateMacroTargets(
    userId: string,
    goal: 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_WEIGHT'
  ): Promise<NutritionGoals> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const weight = user.weight || 70;
    const height = user.height || 170;
    const age = user.age || 25;
    const gender = user.gender || 'MALE';

    const bmr = gender === 'MALE'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

    const activityMultiplier = 1.55;
    const tdee = bmr * activityMultiplier;

    let calorieTarget = tdee;
    if (goal === 'LOSE_WEIGHT') calorieTarget = tdee - 500;
    if (goal === 'GAIN_WEIGHT') calorieTarget = tdee + 300;

    const protein = weight * 2;
    const fat = calorieTarget * 0.25 / 9;
    const carbs = (calorieTarget - protein * 4 - fat * 9) / 4;

    return {
      calories: Math.round(calorieTarget),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: 30,
      water: weight * 35,
    };
  }

  async getWeeklyNutritionSummary(userId: string): Promise<NutritionSummary> {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const meals = await prisma.foodEntry.findMany({
      where: {
        userId,
        loggedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: { food: true },
    });

    const dailyTotals: Record<string, NutritionTotals> = {};
    meals.forEach(meal => {
      const dateKey = format(meal.loggedAt, 'yyyy-MM-dd');
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = this.createEmptyTotals();
      }
      dailyTotals[dateKey].calories += meal.calories;
      dailyTotals[dateKey].protein += meal.protein;
      dailyTotals[dateKey].carbs += meal.carbs;
      dailyTotals[dateKey].fat += meal.fat;
      dailyTotals[dateKey].fiber += meal.fiber || 0;
      dailyTotals[dateKey].sugar += meal.sugar || 0;
      dailyTotals[dateKey].sodium += meal.sodium || 0;
      dailyTotals[dateKey].cholesterol += meal.cholesterol || 0;
    });

    const daysWithMeals = Object.keys(dailyTotals).length;
    const totalsArray = Object.values(dailyTotals);

    const averageDailyCalories = daysWithMeals > 0
      ? totalsArray.reduce((sum, t) => sum + t.calories, 0) / daysWithMeals
      : 0;
    const averageDailyProtein = daysWithMeals > 0
      ? totalsArray.reduce((sum, t) => sum + t.protein, 0) / daysWithMeals
      : 0;
    const averageDailyCarbs = daysWithMeals > 0
      ? totalsArray.reduce((sum, t) => sum + t.carbs, 0) / daysWithMeals
      : 0;
    const averageDailyFat = daysWithMeals > 0
      ? totalsArray.reduce((sum, t) => sum + t.fat, 0) / daysWithMeals
      : 0;

    const foodCount: Record<string, number> = {};
    meals.forEach(meal => {
      const foodName = meal.food?.name || meal.customFoodName || 'Unknown';
      foodCount[foodName] = (foodCount[foodName] || 0) + 1;
    });

    const topFoods = Object.entries(foodCount)
      .map(([food, count]) => ({ food, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const macroTrend = Object.entries(dailyTotals)
      .map(([date, totals]) => ({
        date,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
      averageDailyCalories: Math.round(averageDailyCalories),
      averageDailyProtein: Math.round(averageDailyProtein),
      averageDailyCarbs: Math.round(averageDailyCarbs),
      averageDailyFat: Math.round(averageDailyFat),
      totalMealsLogged: meals.length,
      consistency: Math.round((daysWithMeals / 7) * 100),
      topFoods,
      macroTrend,
    };
  }

  async getCalorieHistory(userId: string, days: number = 30): Promise<{ date: string; calories: number; goal: number }[]> {
    const history: { date: string; calories: number; goal: number }[] = [];
    const goals = await this.getNutritionGoals(userId);

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const meals = await prisma.foodEntry.findMany({
        where: {
          userId,
          loggedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

      history.push({
        date: format(date, 'yyyy-MM-dd'),
        calories: Math.round(totalCalories),
        goal: goals.calories,
      });
    }

    return history;
  }

  private calculateTotals(meals: any[]): NutritionTotals {
    const totals = this.createEmptyTotals();

    meals.forEach(meal => {
      totals.calories += meal.calories;
      totals.protein += meal.protein;
      totals.carbs += meal.carbs;
      totals.fat += meal.fat;
      totals.fiber += meal.fiber || 0;
      totals.sugar += meal.sugar || 0;
      totals.sodium += meal.sodium || 0;
      totals.cholesterol += meal.cholesterol || 0;
    });

    return totals;
  }

  private createEmptyTotals(): NutritionTotals {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    };
  }

  private calculateRemaining(totals: NutritionTotals, goals: NutritionGoals): NutritionTotals {
    return {
      calories: Math.max(0, goals.calories - totals.calories),
      protein: Math.max(0, goals.protein - totals.protein),
      carbs: Math.max(0, goals.carbs - totals.carbs),
      fat: Math.max(0, goals.fat - totals.fat),
      fiber: Math.max(0, (goals.fiber || 30) - totals.fiber),
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    };
  }

  private calculateMacroPercentages(totals: NutritionTotals): MacroPercentages {
    const totalMacros = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;

    if (totalMacros === 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    return {
      protein: Math.round((totals.protein * 4 / totalMacros) * 100),
      carbs: Math.round((totals.carbs * 4 / totalMacros) * 100),
      fat: Math.round((totals.fat * 9 / totalMacros) * 100),
    };
  }

  async getRecentFoods(userId: string, limit: number = 20): Promise<FoodSearchResult[]> {
    const recentEntries = await prisma.foodEntry.findMany({
      where: { userId },
      include: { food: true },
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });

    const uniqueFoodIds = new Set<string>();
    const recentFoods: FoodSearchResult[] = [];

    for (const entry of recentEntries) {
      const foodId = entry.foodId || entry.customFoodName;
      if (foodId && !uniqueFoodIds.has(foodId)) {
        uniqueFoodIds.add(foodId);
        if (entry.food) {
          recentFoods.push({
            id: entry.food.id,
            name: entry.food.name,
            brand: entry.food.brand || undefined,
            category: entry.food.category,
            calories: entry.food.calories,
            protein: entry.food.protein,
            carbs: entry.food.carbs,
            fat: entry.food.fat,
            servingSize: entry.food.servingSize,
            servingUnit: entry.food.servingUnit,
            barcode: entry.food.barcode || undefined,
            isCustom: entry.food.isCustom,
          });
        }
      }
    }

    return recentFoods;
  }

  async getFoodCategories(): Promise<{ category: string; count: number }[]> {
    const foods = await prisma.food.groupBy({
      by: ['category'],
      _count: true,
    });

    return foods
      .map(f => ({ category: f.category, count: f._count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const nutritionService = new NutritionService();