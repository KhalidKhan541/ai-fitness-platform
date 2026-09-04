import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const goalSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'weight', 'workout_count', 'streak', 'strength',
    'endurance', 'body_fat', 'custom',
  ]),
  targetValue: z.number(),
  startValue: z.number().optional(),
  unit: z.string().max(20).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  milestones: z.array(z.object({
    value: z.number(),
    label: z.string(),
  })).optional(),
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
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type');

    const where: any = { userId: user.id };
    if (status !== 'all') where.status = status;
    if (type) where.type = type;

    const goals = await prisma.goal.findMany({
      where,
      include: {
        milestones: true,
        _count: { select: { milestones: true } },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const stats = {
      total: goals.length,
      active: goals.filter((g) => g.status === 'active').length,
      completed: goals.filter((g) => g.status === 'completed').length,
      expired: goals.filter((g) => g.status === 'expired').length,
      averageProgress: goals.length > 0
        ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
        : 0,
    };

    const groupedByType = goals.reduce((acc, goal) => {
      if (!acc[goal.type]) acc[goal.type] = [];
      acc[goal.type].push(goal);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      goals,
      stats,
      groupedByType,
    });
  } catch (error) {
    console.error('GET /api/goals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
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
    const validation = goalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { milestones, ...goalData } = validation.data;

    const currentValue = await getInitialValue(user.id, goalData.type, goalData.startValue);

    const goal = await prisma.goal.create({
      data: {
        ...goalData,
        userId: user.id,
        currentValue,
        startValue: goalData.startValue || currentValue,
        progress: 0,
        status: 'active',
        priority: goalData.priority || 'medium',
        startDate: new Date(goalData.startDate),
        endDate: goalData.endDate ? new Date(goalData.endDate) : null,
        milestones: milestones
          ? {
              create: milestones.map((m) => ({
                value: m.value,
                label: m.label,
                completed: false,
              })),
            }
          : undefined,
      },
      include: {
        milestones: true,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('POST /api/goals error:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

async function getInitialValue(userId: string, type: string, startValue?: number): Promise<number> {
  if (startValue !== undefined) return startValue;

  switch (type) {
    case 'weight': {
      const lastWeight = await prisma.weightEntry.findFirst({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
      });
      return lastWeight?.weight || 0;
    }
    case 'workout_count': {
      const count = await prisma.workoutLog.count({ where: { userId } });
      return count;
    }
    case 'streak': {
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      return stats?.currentStreak || 0;
    }
    case 'body_fat': {
      const lastEntry = await prisma.weightEntry.findFirst({
        where: { userId, bodyFatPercentage: { not: null } },
        orderBy: { recordedAt: 'desc' },
      });
      return lastEntry?.bodyFatPercentage || 0;
    }
    default:
      return 0;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 });
    }

    const existing = await prisma.goal.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
      include: { milestones: true },
    });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('PUT /api/goals error:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
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
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 });
    }

    const existing = await prisma.goal.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goalMilestone.deleteMany({ where: { goalId: id } });
      await tx.goal.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('DELETE /api/goals error:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
