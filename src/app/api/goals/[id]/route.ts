import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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

    const goal = await prisma.goal.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        milestones: { orderBy: { value: 'asc' } },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const progressHistory = await prisma.goalProgress.findMany({
      where: { goalId: params.id },
      orderBy: { recordedAt: 'asc' },
    });

    const daysRemaining = goal.endDate
      ? Math.max(0, Math.ceil(
          (new Date(goal.endDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        ))
      : null;

    const daysElapsed = Math.ceil(
      (new Date().getTime() - new Date(goal.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const projectedCompletion = goal.progress > 0
      ? Math.round(((100 - goal.progress) / goal.progress) * daysElapsed)
      : null;

    const stats = {
      progress: goal.progress,
      daysElapsed,
      daysRemaining,
      projectedCompletion,
      isOnTrack: projectedCompletion !== null && daysRemaining !== null
        ? projectedCompletion <= daysRemaining
        : null,
      milestonesCompleted: goal.milestones.filter((m) => m.completed).length,
      totalMilestones: goal.milestones.length,
    };

    return NextResponse.json({ goal, progressHistory, stats });
  } catch (error) {
    console.error('GET /api/goals/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
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

    const existing = await prisma.goal.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const body = await request.json();
    const { currentValue, status, milestoneId, ...updateData } = body;

    const goal = await prisma.$transaction(async (tx) => {
      if (currentValue !== undefined) {
        const progress = Math.min(100, Math.round(
          ((currentValue - existing.startValue) /
            (existing.targetValue - existing.startValue)) *
            100
        ));

        await tx.goal.update({
          where: { id: params.id },
          data: {
            currentValue,
            progress: Math.max(0, progress),
            status: progress >= 100 ? 'completed' : status || existing.status,
          },
        });

        await tx.goalProgress.create({
          data: {
            goalId: params.id,
            value: currentValue,
            progress: Math.max(0, progress),
            recordedAt: new Date(),
          },
        });

        if (progress >= 100 && existing.status !== 'completed') {
          await tx.achievement.create({
            data: {
              userId: user.id,
              type: 'goal_completed',
              title: `Goal Achieved: ${existing.title}`,
              description: `Completed goal with target value of ${existing.targetValue}`,
              icon: '🎯',
              points: 150,
            },
          });
        }
      }

      if (milestoneId) {
        await tx.goalMilestone.update({
          where: { id: milestoneId },
          data: { completed: true, completedAt: new Date() },
        });
      }

      if (Object.keys(updateData).length > 0) {
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
        await tx.goal.update({
          where: { id: params.id },
          data: updateData,
        });
      }

      return tx.goal.findUnique({
        where: { id: params.id },
        include: { milestones: true },
      });
    });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('PUT /api/goals/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
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

    const existing = await prisma.goal.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.goalMilestone.deleteMany({ where: { goalId: params.id } });
      await tx.goalProgress.deleteMany({ where: { goalId: params.id } });
      await tx.goal.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('DELETE /api/goals/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
