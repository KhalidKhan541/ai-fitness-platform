import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const nutritionAdviceSchema = z.object({
  goal: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'performance', 'health']),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  preferences: z.object({
    mealsPerDay: z.number().min(1).max(10).optional(),
    cookingSkill: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    timeAvailable: z.enum(['minimal', 'moderate', 'plenty']).optional(),
    budget: z.enum(['low', 'moderate', 'high']).optional(),
  }).optional(),
  currentWeight: z.number().optional(),
  targetWeight: z.number().optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  healthConditions: z.array(z.string()).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

async function getNutritionProfile(userId: string) {
  const [preferences, weightEntries, recentMeals] = await Promise.all([
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 3,
    }),
    prisma.meal.findMany({
      where: {
        userId,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        foods: { include: { food: true } },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ]);

  const avgDailyCalories = recentMeals.length > 0
    ? Math.round(
        recentMeals.reduce((acc, meal) => {
          const mealCals = meal.foods.reduce(
            (mAcc, mf) => mAcc + mf.food.caloriesPerServing * mf.servingSize * mf.quantity,
            0
          );
          return acc + mealCals;
        }, 0) / 7
      )
    : 0;

  const avgDailyProtein = recentMeals.length > 0
    ? Math.round(
        recentMeals.reduce((acc, meal) => {
          const mealProtein = meal.foods.reduce(
            (mAcc, mf) => mAcc + mf.food.proteinPerServing * mf.servingSize * mf.quantity,
            0
          );
          return acc + mealProtein;
        }, 0) / 7
      )
    : 0;

  return {
    preferences,
    currentWeight: weightEntries[0]?.weight || null,
    weightHistory: weightEntries.map((w) => ({ weight: w.weight, date: w.recordedAt })),
    avgDailyCalories,
    avgDailyProtein,
    recentMealsCount: recentMeals.length,
  };
}

function calculateCalorieNeeds(
  weight: number,
  activityLevel: string,
  goal: string
): number {
  let bmr = weight * 24;

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

  const goalAdjustments: Record<string, number> = {
    lose_weight: -500,
    gain_muscle: 300,
    maintain: 0,
    performance: 200,
    health: 0,
  };

  return Math.round(tdee + (goalAdjustments[goal] || 0));
}

function generateMealPlan(
  calorieTarget: number,
  proteinTarget: number,
  restrictions: string[],
  preferences: any
): any[] {
  const mealsPerDay = preferences?.mealsPerDay || 4;
  const caloriesPerMeal = Math.round(calorieTarget / mealsPerDay);
  const proteinPerMeal = Math.round(proteinTarget / mealsPerDay);

  const mealTemplates = [
    {
      type: 'breakfast',
      suggestions: [
        { name: 'Oatmeal with berries and nuts', calories: 350, protein: 15, carbs: 55, fat: 10 },
        { name: 'Greek yogurt parfait', calories: 300, protein: 25, carbs: 35, fat: 8 },
        { name: 'Egg white omelet with vegetables', calories: 250, protein: 30, carbs: 10, fat: 8 },
      ],
    },
    {
      type: 'lunch',
      suggestions: [
        { name: 'Grilled chicken salad', calories: 400, protein: 35, carbs: 20, fat: 18 },
        { name: 'Turkey and avocado wrap', calories: 420, protein: 30, carbs: 40, fat: 16 },
        { name: 'Quinoa bowl with vegetables', calories: 380, protein: 20, carbs: 55, fat: 12 },
      ],
    },
    {
      type: 'dinner',
      suggestions: [
        { name: 'Salmon with sweet potato and broccoli', calories: 450, protein: 35, carbs: 40, fat: 15 },
        { name: 'Lean beef stir-fry with rice', calories: 420, protein: 30, carbs: 45, fat: 12 },
        { name: 'Chicken breast with quinoa', calories: 400, protein: 35, carbs: 35, fat: 10 },
      ],
    },
    {
      type: 'snack',
      suggestions: [
        { name: 'Protein shake with banana', calories: 250, protein: 30, carbs: 30, fat: 5 },
        { name: 'Greek yogurt with almonds', calories: 200, protein: 20, carbs: 15, fat: 8 },
        { name: 'Cottage cheese with fruit', calories: 180, protein: 25, carbs: 15, fat: 3 },
      ],
    },
  ];

  return mealTemplates.slice(0, mealsPerDay).map((template) => ({
    type: template.type,
    targetCalories: caloriesPerMeal,
    targetProtein: proteinPerMeal,
    suggestions: template.suggestions.filter((s) => {
      if (restrictions.includes('vegetarian') && (s.name.includes('chicken') || s.name.includes('beef') || s.name.includes('turkey') || s.name.includes('salmon'))) {
        return false;
      }
      if (restrictions.includes('dairy_free') && (s.name.includes('yogurt') || s.name.includes('cheese'))) {
        return false;
      }
      return true;
    }),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = nutritionAdviceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const profile = await getNutritionProfile(user.id);
    const { goal, dietaryRestrictions, allergies, preferences, activityLevel, healthConditions } = validation.data;

    const weight = validation.data.currentWeight || profile.currentWeight || 70;
    const activity = activityLevel || 'moderate';

    const calorieTarget = calculateCalorieNeeds(weight, activity, goal);
    const proteinTarget = Math.round(weight * (goal === 'gain_muscle' ? 2.0 : 1.6));
    const carbTarget = Math.round(calorieTarget * 0.45 / 4);
    const fatTarget = Math.round(calorieTarget * 0.25 / 9);

    const mealPlan = generateMealPlan(
      calorieTarget,
      proteinTarget,
      dietaryRestrictions || [],
      preferences
    );

    const hydrationGoal = Math.round(weight * 35);
    const supplementSuggestions = [];

    if (goal === 'gain_muscle') {
      supplementSuggestions.push(
        { name: 'Creatine Monohydrate', dosage: '5g daily', timing: 'Post-workout' },
        { name: 'Whey Protein', dosage: '25-30g', timing: 'Post-workout' },
        { name: 'BCAA', dosage: '5-10g', timing: 'During workout' }
      );
    }

    if (goal === 'lose_weight') {
      supplementSuggestions.push(
        { name: 'Green Tea Extract', dosage: '500mg', timing: 'Morning' },
        { name: 'Fish Oil', dosage: '1000mg', timing: 'With meals' },
        { name: 'Vitamin D', dosage: '2000 IU', timing: 'Morning' }
      );
    }

    const advice = {
      calorieTarget,
      macros: {
        protein: { grams: proteinTarget, calories: proteinTarget * 4, percentage: Math.round((proteinTarget * 4 / calorieTarget) * 100) },
        carbs: { grams: carbTarget, calories: carbTarget * 4, percentage: Math.round((carbTarget * 4 / calorieTarget) * 100) },
        fat: { grams: fatTarget, calories: fatTarget * 9, percentage: Math.round((fatTarget * 9 / calorieTarget) * 100) },
      },
      mealPlan,
      hydration: {
        dailyGoalMl: hydrationGoal,
        tips: [
          'Drink a glass of water first thing in the morning',
          'Drink water 30 minutes before each meal',
          'Carry a water bottle throughout the day',
          'Drink more on workout days',
        ],
      },
      supplements: supplementSuggestions,
      tips: generateNutritionTips(goal, profile, healthConditions),
      mealTiming: {
        preWorkout: 'Eat a light meal 2-3 hours before exercise, or a snack 30-60 minutes before',
        postWorkout: 'Consume protein and carbs within 30-60 minutes after exercise',
        beforeBed: 'Avoid heavy meals 2-3 hours before sleep',
      },
      currentAnalysis: {
        avgDailyCalories: profile.avgDailyCalories,
        avgDailyProtein: profile.avgDailyProtein,
        isOnTrack: profile.avgDailyCalories > 0
          ? Math.abs(profile.avgDailyCalories - calorieTarget) < calorieTarget * 0.1
          : null,
      },
    };

    return NextResponse.json({ advice }, { status: 200 });
  } catch (error) {
    console.error('POST /api/ai/nutrition error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nutrition advice' },
      { status: 500 }
    );
  }
}

function generateNutritionTips(goal: string, profile: any, healthConditions?: string[]): string[] {
  const tips: string[] = [];

  if (goal === 'lose_weight') {
    tips.push('Create a moderate caloric deficit of 500 calories for sustainable weight loss');
    tips.push('Increase protein intake to preserve muscle mass during weight loss');
    tips.push('Eat plenty of fiber-rich foods to stay full longer');
  } else if (goal === 'gain_muscle') {
    tips.push('Eat in a slight caloric surplus of 200-300 calories');
    tips.push('Consume 1.6-2.2g of protein per kg of body weight');
    tips.push('Time your carbs around workouts for optimal performance');
  }

  if (profile.avgDailyCalories === 0) {
    tips.push('Start tracking your meals to understand your current eating patterns');
  }

  if (healthConditions?.includes('diabetes')) {
    tips.push('Monitor blood sugar levels around meals');
    tips.push('Choose complex carbohydrates with low glycemic index');
  }

  tips.push('Focus on whole, minimally processed foods');
  tips.push('Don\'t skip meals - maintain consistent eating patterns');

  return tips;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getNutritionProfile(user.id);

    return NextResponse.json({
      currentProfile: {
        weight: profile.currentWeight,
        avgDailyCalories: profile.avgDailyCalories,
        avgDailyProtein: profile.avgDailyProtein,
        recentMealsCount: profile.recentMealsCount,
      },
      preferences: profile.preferences,
    });
  } catch (error) {
    console.error('GET /api/ai/nutrition error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition profile' },
      { status: 500 }
    );
  }
}
