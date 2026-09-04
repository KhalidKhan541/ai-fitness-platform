import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, MealPlan, MealPlanEntry, Prisma } from '@prisma/client';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const prisma = new PrismaClient();

export interface CreateMealPlanInput {
  name: string;
  startDate: Date;
  endDate: Date;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  meals: MealPlanDayInput[];
}

export interface MealPlanDayInput {
  dayOfWeek: number;
  meals: MealPlanMealInput[];
}

export interface MealPlanMealInput {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  foodEntries: MealPlanFoodInput[];
}

export interface MealPlanFoodInput {
  foodId: string;
  servings: number;
  customNote?: string;
}

export interface WeeklyMealPlan {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  targets: NutritionTargets;
  days: MealPlanDay[];
  totalNutrition: NutritionTargets;
  shoppingList: ShoppingListItem[];
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface MealPlanDay {
  date: Date;
  dayName: string;
  meals: MealPlanMeal[];
  totals: NutritionTargets;
  remaining: NutritionTargets;
}

export interface MealPlanMeal {
  type: string;
  entries: MealPlanEntryWithFood[];
  totals: NutritionTargets;
}

export interface MealPlanEntryWithFood extends MealPlanEntry {
  food: any;
}

export interface ShoppingListItem {
  category: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    estimatedCost?: number;
  }[];
}

export interface MealTemplate {
  id: string;
  name: string;
  description: string;
  mealType: string;
  foods: {
    foodId: string;
    foodName: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  tags: string[];
}

export interface RecipeSuggestion {
  id: string;
  name: string;
  description: string;
  mealType: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition: NutritionTargets;
  tags: string[];
  imageUrl?: string;
}

export interface MealPlanSearchFilters {
  query?: string;
  minCalories?: number;
  maxCalories?: number;
  tags?: string[];
  mealType?: string;
}

export class MealPlannerService {
  private readonly MEAL_TEMPLATES: Omit<MealTemplate, 'id'>[] = [
    {
      name: 'High Protein Breakfast',
      description: 'Protein-packed breakfast to start the day right',
      mealType: 'BREAKFAST',
      foods: [
        { foodId: '', foodName: 'Eggs', servings: 3, calories: 216, protein: 18, carbs: 1.2, fat: 15 },
        { foodId: '', foodName: 'Oatmeal', servings: 1, calories: 150, protein: 5, carbs: 27, fat: 2.5 },
        { foodId: '', foodName: 'Greek Yogurt', servings: 1, calories: 100, protein: 17, carbs: 6, fat: 0.7 },
      ],
      totalCalories: 466,
      totalProtein: 40,
      totalCarbs: 34.2,
      totalFat: 18.2,
      tags: ['HIGH_PROTEIN', 'BREAKFAST', 'MUSCLE_BUILDING'],
    },
    {
      name: 'Light Lunch Salad',
      description: 'Healthy and filling salad for lunch',
      mealType: 'LUNCH',
      foods: [
        { foodId: '', foodName: 'Chicken Breast', servings: 1, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        { foodId: '', foodName: 'Mixed Greens', servings: 2, calories: 20, protein: 1.5, carbs: 3, fat: 0.2 },
        { foodId: '', foodName: 'Avocado', servings: 0.5, calories: 120, protein: 1.5, carbs: 6.5, fat: 11 },
        { foodId: '', foodName: 'Olive Oil', servings: 1, calories: 120, protein: 0, carbs: 0, fat: 14 },
      ],
      totalCalories: 425,
      totalProtein: 34,
      totalCarbs: 9.5,
      totalFat: 28.8,
      tags: ['HEALTHY', 'LUNCH', 'HIGH_PROTEIN'],
    },
    {
      name: 'Post-Workout Dinner',
      description: 'Recovery meal with protein and carbs',
      mealType: 'DINNER',
      foods: [
        { foodId: '', foodName: 'Salmon Fillet', servings: 1, calories: 208, protein: 20, carbs: 0, fat: 13 },
        { foodId: '', foodName: 'Brown Rice', servings: 1, calories: 216, protein: 5, carbs: 45, fat: 1.8 },
        { foodId: '', foodName: 'Broccoli', servings: 2, calories: 62, protein: 5, carbs: 12, fat: 0.6 },
      ],
      totalCalories: 486,
      totalProtein: 30,
      totalCarbs: 57,
      totalFat: 15.4,
      tags: ['RECOVERY', 'DINNER', 'HIGH_PROTEIN'],
    },
    {
      name: 'Healthy Snack',
      description: 'Nutritious snack between meals',
      mealType: 'SNACK',
      foods: [
        { foodId: '', foodName: 'Almonds', servings: 1, calories: 164, protein: 6, carbs: 6, fat: 14 },
        { foodId: '', foodName: 'Apple', servings: 1, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
      ],
      totalCalories: 259,
      totalProtein: 6.5,
      totalCarbs: 31,
      totalFat: 14.3,
      tags: ['SNACK', 'HEALTHY', 'ENERGY'],
    },
    {
      name: 'Vegetarian Buddha Bowl',
      description: 'Plant-based bowl packed with nutrients',
      mealType: 'LUNCH',
      foods: [
        { foodId: '', foodName: 'Quinoa', servings: 1, calories: 222, protein: 8, carbs: 39, fat: 3.5 },
        { foodId: '', foodName: 'Chickpeas', servings: 1, calories: 269, protein: 15, carbs: 45, fat: 4.2 },
        { foodId: '', foodName: 'Sweet Potato', servings: 1, calories: 112, protein: 2, carbs: 26, fat: 0.1 },
        { foodId: '', foodName: 'Spinach', servings: 2, calories: 14, protein: 1.8, carbs: 2.2, fat: 0.2 },
      ],
      totalCalories: 617,
      totalProtein: 26.8,
      totalCarbs: 112.2,
      totalFat: 8,
      tags: ['VEGETARIAN', 'LUNCH', 'HEALTHY'],
    },
    {
      name: 'Muscle Building Dinner',
      description: 'High-protein meal for muscle growth',
      mealType: 'DINNER',
      foods: [
        { foodId: '', foodName: 'Lean Ground Beef', servings: 1.5, calories: 375, protein: 39, carbs: 0, fat: 22.5 },
        { foodId: '', foodName: 'White Rice', servings: 1, calories: 206, protein: 4.4, carbs: 45, fat: 0.4 },
        { foodId: '', foodName: 'Bell Pepper', servings: 1, calories: 30, protein: 1, carbs: 7, fat: 0.3 },
      ],
      totalCalories: 611,
      totalProtein: 44.4,
      totalCarbs: 52,
      totalFat: 23.2,
      tags: ['MUSCLE_BUILDING', 'DINNER', 'HIGH_PROTEIN'],
    },
  ];

  private readonly RECIPES: RecipeSuggestion[] = [
    {
      id: 'chicken-rice-bowl',
      name: 'Chicken Rice Bowl',
      description: 'Simple and effective muscle-building meal',
      mealType: 'LUNCH',
      ingredients: [
        '200g chicken breast',
        '1 cup brown rice',
        '1 cup broccoli',
        '1 tbsp olive oil',
        'Salt and pepper to taste',
      ],
      instructions: [
        'Cook brown rice according to package instructions',
        'Season chicken breast with salt and pepper',
        'Grill or pan-fry chicken until cooked through',
        'Steam broccoli until tender',
        'Assemble bowl with rice, chicken, and broccoli',
        'Drizzle with olive oil',
      ],
      prepTime: 10,
      cookTime: 25,
      servings: 1,
      nutrition: { calories: 520, protein: 42, carbs: 48, fat: 16 },
      tags: ['HIGH_PROTEIN', 'MEAL_PREP', 'MUSCLE_BUILDING'],
    },
    {
      id: 'overnight-oats',
      name: 'Protein Overnight Oats',
      description: 'Make-ahead breakfast packed with protein',
      mealType: 'BREAKFAST',
      ingredients: [
        '1/2 cup oats',
        '1 scoop whey protein',
        '1 cup milk',
        '1 tbsp peanut butter',
        '1/2 banana',
      ],
      instructions: [
        'Mix oats, protein powder, and milk in a jar',
        'Stir in peanut butter',
        'Refrigerate overnight',
        'Top with sliced banana before eating',
      ],
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      nutrition: { calories: 450, protein: 35, carbs: 52, fat: 14 },
      tags: ['MAKE_AHEAD', 'HIGH_PROTEIN', 'BREAKFAST'],
    },
    {
      id: 'salmon-sweet-potato',
      name: 'Baked Salmon with Sweet Potato',
      description: 'Omega-3 rich dinner for recovery',
      mealType: 'DINNER',
      ingredients: [
        '150g salmon fillet',
        '1 medium sweet potato',
        '1 cup asparagus',
        '1 tbsp olive oil',
        'Lemon juice',
      ],
      instructions: [
        'Preheat oven to 400°F (200°C)',
        'Cube sweet potato and roast for 20 minutes',
        'Season salmon with olive oil and lemon',
        'Bake salmon alongside sweet potato for 12-15 minutes',
        'Steam asparagus until tender',
        'Serve everything together',
      ],
      prepTime: 10,
      cookTime: 35,
      servings: 1,
      nutrition: { calories: 480, protein: 34, carbs: 38, fat: 22 },
      tags: ['OMEGA_3', 'RECOVERY', 'DINNER'],
    },
    {
      id: 'protein-pancakes',
      name: 'Protein Pancakes',
      description: 'Fluffy high-protein pancakes for breakfast',
      mealType: 'BREAKFAST',
      ingredients: [
        '1 banana',
        '2 eggs',
        '1 scoop protein powder',
        '1/4 cup oats',
        'Cinnamon',
      ],
      instructions: [
        'Blend all ingredients until smooth',
        'Heat non-stick pan over medium heat',
        'Pour small circles of batter',
        'Cook until bubbles form, then flip',
        'Serve with berries or Greek yogurt',
      ],
      prepTime: 5,
      cookTime: 10,
      servings: 1,
      nutrition: { calories: 380, protein: 32, carbs: 42, fat: 10 },
      tags: ['HIGH_PROTEIN', 'BREAKFAST', 'QUICK'],
    },
    {
      id: 'tuna-wrap',
      name: 'Tuna Salad Wrap',
      description: 'Quick and easy high-protein lunch',
      mealType: 'LUNCH',
      ingredients: [
        '1 can tuna',
        '2 tbsp Greek yogurt',
        '1 whole wheat wrap',
        'Mixed greens',
        'Diced celery',
      ],
      instructions: [
        'Drain tuna and mix with Greek yogurt',
        'Add diced celery and season',
        'Lay out wrap and add mixed greens',
        'Add tuna mixture and roll up',
        'Cut in half and serve',
      ],
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      nutrition: { calories: 320, protein: 38, carbs: 28, fat: 6 },
      tags: ['QUICK', 'HIGH_PROTEIN', 'LUNCH'],
    },
  ];

  async createMealPlan(userId: string, input: CreateMealPlanInput): Promise<MealPlan> {
    return prisma.mealPlan.create({
      data: {
        id: uuidv4(),
        userId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        calorieTarget: input.calorieTarget,
        proteinTarget: input.proteinTarget,
        carbTarget: input.carbTarget,
        fatTarget: input.fatTarget,
        entries: {
          create: input.meals.flatMap(day =>
            day.meals.flatMap(meal =>
              meal.foodEntries.map(entry => ({
                id: uuidv4(),
                dayOfWeek: day.dayOfWeek,
                mealType: meal.mealType,
                foodId: entry.foodId,
                servings: entry.servings,
                customNote: entry.customNote,
              }))
            )
          ),
        },
      },
      include: {
        entries: {
          include: { food: true },
        },
      },
    });
  }

  async getMealPlan(planId: string): Promise<WeeklyMealPlan | null> {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: {
        entries: {
          include: { food: true },
        },
      },
    });

    if (!plan) return null;

    return this.formatMealPlan(plan);
  }

  async getUserMealPlans(userId: string): Promise<WeeklyMealPlan[]> {
    const plans = await prisma.mealPlan.findMany({
      where: { userId },
      include: {
        entries: {
          include: { food: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return plans.map(plan => this.formatMealPlan(plan));
  }

  async updateMealPlan(
    userId: string,
    planId: string,
    input: Partial<CreateMealPlanInput>
  ): Promise<MealPlan> {
    const existing = await prisma.mealPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!existing) throw new Error('Meal plan not found');

    if (input.meals) {
      await prisma.mealPlanEntry.deleteMany({ where: { planId } });
    }

    return prisma.mealPlan.update({
      where: { id: planId },
      data: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        calorieTarget: input.calorieTarget,
        proteinTarget: input.proteinTarget,
        carbTarget: input.carbTarget,
        fatTarget: input.fatTarget,
        entries: input.meals
          ? {
              create: input.meals.flatMap(day =>
                day.meals.flatMap(meal =>
                  meal.foodEntries.map(entry => ({
                    id: uuidv4(),
                    dayOfWeek: day.dayOfWeek,
                    mealType: meal.mealType,
                    foodId: entry.foodId,
                    servings: entry.servings,
                    customNote: entry.customNote,
                  }))
                )
              ),
            }
          : undefined,
      },
      include: {
        entries: {
          include: { food: true },
        },
      },
    });
  }

  async deleteMealPlan(userId: string, planId: string): Promise<void> {
    const existing = await prisma.mealPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!existing) throw new Error('Meal plan not found');

    await prisma.$transaction([
      prisma.mealPlanEntry.deleteMany({ where: { planId } }),
      prisma.mealPlan.delete({ where: { id: planId } }),
    ]);
  }

  async generateWeeklyPlan(
    userId: string,
    targets: NutritionTargets,
    startDate: Date
  ): Promise<WeeklyMealPlan> {
    const days = eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, 6),
    });

    const meals = days.map((day, index) => ({
      dayOfWeek: index,
      meals: this.generateDayMeals(targets),
    }));

    const plan = await this.createMealPlan(userId, {
      name: `Weekly Plan - ${format(startDate, 'MMM d')}`,
      startDate,
      endDate: addDays(startDate, 6),
      calorieTarget: targets.calories,
      proteinTarget: targets.protein,
      carbTarget: targets.carbs,
      fatTarget: targets.fat,
      meals,
    });

    return this.formatMealPlan(plan);
  }

  private generateDayMeals(targets: NutritionTargets): MealPlanMealInput[] {
    const calorieDistribution = {
      BREAKFAST: 0.25,
      LUNCH: 0.35,
      DINNER: 0.30,
      SNACK: 0.10,
    };

    return [
      {
        mealType: 'BREAKFAST',
        foodEntries: this.getMealsForType('BREAKFAST', targets.calories * calorieDistribution.BREAKFAST),
      },
      {
        mealType: 'LUNCH',
        foodEntries: this.getMealsForType('LUNCH', targets.calories * calorieDistribution.LUNCH),
      },
      {
        mealType: 'DINNER',
        foodEntries: this.getMealsForType('DINNER', targets.calories * calorieDistribution.DINNER),
      },
      {
        mealType: 'SNACK',
        foodEntries: this.getMealsForType('SNACK', targets.calories * calorieDistribution.SNACK),
      },
    ];
  }

  private getMealsForType(mealType: string, targetCalories: number): MealPlanFoodInput[] {
    const templates = this.MEAL_TEMPLATES.filter(t => t.mealType === mealType);
    if (templates.length === 0) return [];

    const template = templates[Math.floor(Math.random() * templates.length)];
    const scaleFactor = targetCalories / template.totalCalories;

    return template.foods.map(food => ({
      foodId: food.foodId,
      servings: Math.round(food.servings * scaleFactor * 10) / 10,
    }));
  }

  async generateShoppingList(planId: string): Promise<ShoppingListItem[]> {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: {
        entries: {
          include: { food: true },
        },
      },
    });

    if (!plan) throw new Error('Meal plan not found');

    const itemMap: Record<string, { name: string; quantity: number; unit: string; category: string }> = {};

    plan.entries.forEach(entry => {
      if (entry.food) {
        const key = entry.food.id;
        if (!itemMap[key]) {
          itemMap[key] = {
            name: entry.food.name,
            quantity: 0,
            unit: entry.food.servingUnit,
            category: entry.food.category,
          };
        }
        itemMap[key].quantity += entry.servings * entry.food.servingSize;
      }
    });

    const categoryMap: Record<string, typeof itemMap[string][]> = {};
    Object.values(itemMap).forEach(item => {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = [];
      }
      categoryMap[item.category].push(item);
    });

    return Object.entries(categoryMap)
      .map(([category, items]) => ({
        category,
        items: items.map(item => ({
          name: item.name,
          quantity: Math.round(item.quantity * 10) / 10,
          unit: item.unit,
        })),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  async getMealTemplates(mealType?: string): Promise<MealTemplate[]> {
    const templates = this.MEAL_TEMPLATES;
    if (mealType) {
      return templates.filter(t => t.mealType === mealType);
    }
    return templates;
  }

  async getRecipeSuggestions(
    filters: MealPlanSearchFilters
  ): Promise<RecipeSuggestion[]> {
    let recipes = [...this.RECIPES];

    if (filters.query) {
      const query = filters.query.toLowerCase();
      recipes = recipes.filter(
        r =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (filters.mealType) {
      recipes = recipes.filter(r => r.mealType === filters.mealType);
    }

    if (filters.tags && filters.tags.length > 0) {
      recipes = recipes.filter(r =>
        filters.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (filters.minCalories) {
      recipes = recipes.filter(r => r.nutrition.calories >= filters.minCalories!);
    }

    if (filters.maxCalories) {
      recipes = recipes.filter(r => r.nutrition.calories <= filters.maxCalories!);
    }

    return recipes;
  }

  async getRecipeById(recipeId: string): Promise<RecipeSuggestion | undefined> {
    return this.RECIPES.find(r => r.id === recipeId);
  }

  async calculateMealPlanNutrition(planId: string): Promise<{
    dailyAverages: NutritionTargets;
    weeklyTotals: NutritionTargets;
    adherence: number;
  }> {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: {
        entries: {
          include: { food: true },
        },
      },
    });

    if (!plan) throw new Error('Meal plan not found');

    const weeklyTotals: NutritionTargets = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    plan.entries.forEach(entry => {
      if (entry.food) {
        weeklyTotals.calories += entry.food.calories * entry.servings;
        weeklyTotals.protein += entry.food.protein * entry.servings;
        weeklyTotals.carbs += entry.food.carbs * entry.servings;
        weeklyTotals.fat += entry.food.fat * entry.servings;
      }
    });

    const days = Math.ceil(
      (plan.endDate.getTime() - plan.startDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    const dailyAverages: NutritionTargets = {
      calories: weeklyTotals.calories / days,
      protein: weeklyTotals.protein / days,
      carbs: weeklyTotals.carbs / days,
      fat: weeklyTotals.fat / days,
    };

    const targetCalories = plan.calorieTarget * days;
    const adherence = targetCalories > 0
      ? Math.min(100, (weeklyTotals.calories / targetCalories) * 100)
      : 0;

    return {
      dailyAverages,
      weeklyTotals,
      adherence: Math.round(adherence),
    };
  }

  async duplicateMealPlan(userId: string, planId: string, newName?: string): Promise<MealPlan> {
    const original = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: { entries: true },
    });

    if (!original) throw new Error('Meal plan not found');

    return this.createMealPlan(userId, {
      name: newName ?? `${original.name} (Copy)`,
      startDate: addDays(original.endDate, 1),
      endDate: addDays(original.endDate, 1 + Math.ceil(
        (original.endDate.getTime() - original.startDate.getTime()) / (24 * 60 * 60 * 1000)
      )),
      calorieTarget: original.calorieTarget,
      proteinTarget: original.proteinTarget,
      carbTarget: original.carbTarget,
      fatTarget: original.fatTarget,
      meals: original.entries.reduce((acc, entry) => {
        const existingDay = acc.find(d => d.dayOfWeek === entry.dayOfWeek);
        if (existingDay) {
          const existingMeal = existingDay.meals.find(m => m.mealType === entry.mealType);
          if (existingMeal) {
            existingMeal.foodEntries.push({
              foodId: entry.foodId,
              servings: entry.servings,
              customNote: entry.customNote || undefined,
            });
          } else {
            existingDay.meals.push({
              mealType: entry.mealType as any,
              foodEntries: [{
                foodId: entry.foodId,
                servings: entry.servings,
                customNote: entry.customNote || undefined,
              }],
            });
          }
        } else {
          acc.push({
            dayOfWeek: entry.dayOfWeek,
            meals: [{
              mealType: entry.mealType as any,
              foodEntries: [{
                foodId: entry.foodId,
                servings: entry.servings,
                customNote: entry.customNote || undefined,
              }],
            }],
          });
        }
        return acc;
      }, [] as MealPlanDayInput[]),
    });
  }

  private formatMealPlan(plan: any): WeeklyMealPlan {
    const days = eachDayOfInterval({
      start: plan.startDate,
      end: plan.endDate,
    });

    const formattedDays: MealPlanDay[] = days.map((day, index) => {
      const dayEntries = plan.entries.filter((e: any) => {
        const entryDay = Math.floor(
          (e.loggedAt?.getTime() - plan.startDate.getTime()) / (24 * 60 * 60 * 1000)
        ) % 7;
        return entryDay === index;
      });

      const meals: MealPlanMeal[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map(mealType => {
        const mealEntries = dayEntries.filter((e: any) => e.mealType === mealType);
        const totals = this.calculateMealTotals(mealEntries);
        return {
          type: mealType,
          entries: mealEntries,
          totals,
        };
      });

      const totals = this.calculateDayTotals(meals);
      const remaining: NutritionTargets = {
        calories: plan.calorieTarget - totals.calories,
        protein: plan.proteinTarget - totals.protein,
        carbs: plan.carbTarget - totals.carbs,
        fat: plan.fatTarget - totals.fat,
      };

      return {
        date: day,
        dayName: format(day, 'EEEE'),
        meals,
        totals,
        remaining,
      };
    });

    const totalNutrition = this.calculateWeeklyTotals(formattedDays);

    return {
      id: plan.id,
      name: plan.name,
      startDate: plan.startDate,
      endDate: plan.endDate,
      targets: {
        calories: plan.calorieTarget,
        protein: plan.proteinTarget,
        carbs: plan.carbTarget,
        fat: plan.fatTarget,
      },
      days: formattedDays,
      totalNutrition,
      shoppingList: [],
    };
  }

  private calculateMealTotals(entries: any[]): NutritionTargets {
    return entries.reduce(
      (totals, entry) => ({
        calories: totals.calories + (entry.food?.calories || 0) * entry.servings,
        protein: totals.protein + (entry.food?.protein || 0) * entry.servings,
        carbs: totals.carbs + (entry.food?.carbs || 0) * entry.servings,
        fat: totals.fat + (entry.food?.fat || 0) * entry.servings,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  private calculateDayTotals(meals: MealPlanMeal[]): NutritionTargets {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.totals.calories,
        protein: totals.protein + meal.totals.protein,
        carbs: totals.carbs + meal.totals.carbs,
        fat: totals.fat + meal.totals.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  private calculateWeeklyTotals(days: MealPlanDay[]): NutritionTargets {
    return days.reduce(
      (totals, day) => ({
        calories: totals.calories + day.totals.calories,
        protein: totals.protein + day.totals.protein,
        carbs: totals.carbs + day.totals.carbs,
        fat: totals.fat + day.totals.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }
}

export const mealPlannerService = new MealPlannerService();