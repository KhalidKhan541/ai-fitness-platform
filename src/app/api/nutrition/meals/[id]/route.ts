import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateMealSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  notes: z.string().max(300).optional(),
  foods: z.array(z.object({
    foodId: z.string(),
    servingSize: z.number().min(0.1).max(100),
    servingUnit: z.string().max(20),
    quantity: z.number().min(1).max(50),
  })).optional(),
});

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
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
  );
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meal = await prisma.meal.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        foods: {
          include: {
            food: true,
          },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    const nutrition = calculateMealNutrition(meal.foods);

    return NextResponse.json({ meal: { ...meal, nutrition } });
  } catch (error) {
    console.error('GET /api/nutrition/meals/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.meal.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateMealSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { foods, ...updateData } = validation.data;

    const meal = await prisma.$transaction(async (tx) => {
      if (foods) {
        await tx.mealFood.deleteMany({ where: { mealId: params.id } });

        const foodIds = foods.map((f) => f.foodId);
        const existingFoods = await tx.food.findMany({
          where: { id: { in: foodIds } },
        });

        if (existingFoods.length !== foodIds.length) {
          throw new Error('Invalid food IDs');
        }

        await tx.mealFood.createMany({
          data: foods.map((f) => ({
            mealId: params.id,
            foodId: f.foodId,
            servingSize: f.servingSize,
            servingUnit: f.servingUnit,
            quantity: f.quantity,
          })),
        });
      }

      return tx.meal.update({
        where: { id: params.id },
        data: updateData,
        include: {
          foods: {
            include: { food: true },
          },
        },
      });
    });

    const nutrition = calculateMealNutrition(meal.foods);

    return NextResponse.json({ meal: { ...meal, nutrition } });
  } catch (error: any) {
    console.error('PUT /api/nutrition/meals/[id] error:', error);
    if (error.message === 'Invalid food IDs') {
      return NextResponse.json({ error: 'Invalid food IDs' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.meal.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.mealFood.deleteMany({ where: { mealId: params.id } });
      await tx.meal.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'Meal deleted' });
  } catch (error) {
    console.error('DELETE /api/nutrition/meals/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}
