import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const mealSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  date: z.string().optional(),
  foods: z.array(z.object({
    foodId: z.string(),
    servingSize: z.number().min(0.1).max(100),
    servingUnit: z.string().max(20),
    quantity: z.number().min(1).max(50),
  })).min(1),
  notes: z.string().max(300).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

function calculateMealNutrition(foods: any[]) {
  return foods.reduce(
    (acc, food) => {
      const multiplier = food.servingSize * food.quantity;
      return {
        calories: acc.calories + (food.food.caloriesPerServing * multiplier),
        protein: acc.protein + (food.food.proteinPerServing * multiplier),
        carbs: acc.carbs + (food.food.carbsPerServing * multiplier),
        fat: acc.fat + (food.food.fatPerServing * multiplier),
        fiber: acc.fiber + ((food.food.fiberPerServing || 0) * multiplier),
        sugar: acc.sugar + ((food.food.sugarPerServing || 0) * multiplier),
        sodium: acc.sodium + ((food.food.sodiumPerServing || 0) * multiplier),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [meals, total] = await Promise.all([
      prisma.meal.findMany({
        where: {
          userId: user.id,
          date: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          foods: {
            include: {
              food: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.meal.count({
        where: {
          userId: user.id,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const mealsWithNutrition = meals.map((meal) => ({
      ...meal,
      nutrition: calculateMealNutrition(meal.foods),
    }));

    const dailyTotals = mealsWithNutrition.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.nutrition.calories,
        protein: acc.protein + meal.nutrition.protein,
        carbs: acc.carbs + meal.nutrition.carbs,
        fat: acc.fat + meal.nutrition.fat,
        fiber: acc.fiber + meal.nutrition.fiber,
        sugar: acc.sugar + meal.nutrition.sugar,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
      select: { dailyCalorieGoal: true, dailyProteinGoal: true, dailyCarbGoal: true, dailyFatGoal: true },
    });

    const targets = {
      calories: preferences?.dailyCalorieGoal || 2000,
      protein: preferences?.dailyProteinGoal || 150,
      carbs: preferences?.dailyCarbGoal || 250,
      fat: preferences?.dailyFatGoal || 65,
    };

    return NextResponse.json({
      date,
      meals: mealsWithNutrition,
      dailyTotals,
      targets,
      progress: {
        calories: Math.round((dailyTotals.calories / targets.calories) * 100),
        protein: Math.round((dailyTotals.protein / targets.protein) * 100),
        carbs: Math.round((dailyTotals.carbs / targets.carbs) * 100),
        fat: Math.round((dailyTotals.fat / targets.fat) * 100),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/nutrition/meals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = mealSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, type, date, foods, notes } = validation.data;

    const foodIds = foods.map((f) => f.foodId);
    const existingFoods = await prisma.food.findMany({
      where: { id: { in: foodIds } },
    });

    if (existingFoods.length !== foodIds.length) {
      const missingIds = foodIds.filter(
        (id) => !existingFoods.find((f) => f.id === id)
      );
      return NextResponse.json(
        { error: `Invalid food IDs: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    const mealDate = date ? new Date(date) : new Date();

    const meal = await prisma.meal.create({
      data: {
        name,
        type,
        date: mealDate,
        userId: user.id,
        notes: notes || '',
        foods: {
          create: foods.map((f) => ({
            foodId: f.foodId,
            servingSize: f.servingSize,
            servingUnit: f.servingUnit,
            quantity: f.quantity,
          })),
        },
      },
      include: {
        foods: {
          include: { food: true },
        },
      },
    });

    const nutrition = calculateMealNutrition(meal.foods);

    return NextResponse.json(
      { meal: { ...meal, nutrition } },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/nutrition/meals error:', error);
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const mealType = searchParams.get('type');

    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      userId: user.id,
      date: { gte: startOfDay, lte: endOfDay },
    };

    if (mealType) where.type = mealType;

    const meals = await prisma.meal.findMany({ where, select: { id: true } });

    await prisma.$transaction(
      meals.map((meal) =>
        prisma.mealFood.deleteMany({ where: { mealId: meal.id } })
      )
    );
    await prisma.meal.deleteMany({ where });

    return NextResponse.json({ message: `${meals.length} meals deleted` });
  } catch (error) {
    console.error('DELETE /api/nutrition/meals error:', error);
    return NextResponse.json(
      { error: 'Failed to delete meals' },
      { status: 500 }
    );
  }
}
