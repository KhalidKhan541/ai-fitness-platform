import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['lose_weight', 'gain_muscle', 'maintain', 'performance', 'custom']),
  startDate: z.string(),
  endDate: z.string().optional(),
  dailyCalories: z.number().min(500).max(10000),
  dailyProtein: z.number().min(0).max(500),
  dailyCarbs: z.number().min(0).max(1000),
  dailyFat: z.number().min(0).max(300),
  dailyFiber: z.number().min(0).max(100).optional(),
  mealsPerDay: z.number().min(1).max(10).optional(),
  preferences: z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    excludedFoods: z.array(z.string()).optional(),
    preferredFoods: z.array(z.string()).optional(),
  }).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const where: any = { userId: user.id };
    if (active === 'true') where.status = 'active';
    if (active === 'false') where.status = { in: ['completed', 'cancelled'] };

    const plans = await prisma.nutritionPlan.findMany({
      where,
      include: {
        dailyMeals: {
          include: {
            foods: { include: { food: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activePlan = plans.find((p) => p.status === 'active');

    return NextResponse.json({
      plans,
      activePlan: activePlan || null,
    });
  } catch (error) {
    console.error('GET /api/nutrition/plan error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition plans' },
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
    const validation = planSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { preferences, ...planData } = validation.data;

    await prisma.nutritionPlan.updateMany({
      where: { userId: user.id, status: 'active' },
      data: { status: 'paused' },
    });

    const plan = await prisma.nutritionPlan.create({
      data: {
        ...planData,
        userId: user.id,
        status: 'active',
        startDate: new Date(planData.startDate),
        endDate: planData.endDate ? new Date(planData.endDate) : null,
        dietaryRestrictions: preferences?.dietaryRestrictions || [],
        allergies: preferences?.allergies || [],
        excludedFoods: preferences?.excludedFoods || [],
        preferredFoods: preferences?.preferredFoods || [],
      },
    });

    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: {
        dailyCalorieGoal: planData.dailyCalories,
        dailyProteinGoal: planData.dailyProtein,
        dailyCarbGoal: planData.dailyCarbs,
        dailyFatGoal: planData.dailyFat,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('POST /api/nutrition/plan error:', error);
    return NextResponse.json(
      { error: 'Failed to create nutrition plan' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const existing = await prisma.nutritionPlan.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan = await prisma.nutritionPlan.update({
      where: { id },
      data: {
        ...updateData,
        ...(status && { status }),
        ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
        ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
      },
    });

    if (status === 'active') {
      await prisma.nutritionPlan.updateMany({
        where: { userId: user.id, id: { not: id }, status: 'active' },
        data: { status: 'paused' },
      });

      await prisma.userPreferences.update({
        where: { userId: user.id },
        data: {
          dailyCalorieGoal: plan.dailyCalories,
          dailyProteinGoal: plan.dailyProtein,
          dailyCarbGoal: plan.dailyCarbs,
          dailyFatGoal: plan.dailyFat,
        },
      });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('PUT /api/nutrition/plan error:', error);
    return NextResponse.json(
      { error: 'Failed to update nutrition plan' },
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const existing = await prisma.nutritionPlan.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.planMeal.deleteMany({ where: { planId: id } });
      await tx.nutritionPlan.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Nutrition plan deleted' });
  } catch (error) {
    console.error('DELETE /api/nutrition/plan error:', error);
    return NextResponse.json(
      { error: 'Failed to delete nutrition plan' },
      { status: 500 }
    );
  }
}
