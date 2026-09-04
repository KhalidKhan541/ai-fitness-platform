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

    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        muscleGroups: true,
        equipment: true,
        alternativeExercises: {
          include: {
            category: true,
            muscleGroups: true,
          },
          take: 5,
        },
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const recentLogs = await prisma.exerciseLog.findMany({
      where: {
        exerciseId: params.id,
        workoutLog: { userId: user.id },
      },
      include: {
        workoutLog: {
          select: { completedAt: true },
        },
      },
      orderBy: { workoutLog: { completedAt: 'desc' } },
      take: 10,
    });

    const stats = {
      totalSets: recentLogs.reduce(
        (acc, log) => acc + log.sets.filter((s: any) => s.completed).length,
        0
      ),
      totalReps: recentLogs.reduce(
        (acc, log) =>
          acc + log.sets.reduce((setAcc: number, s: any) => setAcc + s.reps, 0),
        0
      ),
      maxWeight: Math.max(
        ...recentLogs.flatMap((log) =>
          log.sets.map((s: any) => s.weight || 0)
        ),
        0
      ),
      maxReps: Math.max(
        ...recentLogs.flatMap((log) =>
          log.sets.map((s: any) => s.reps || 0)
        ),
        0
      ),
      totalVolume: recentLogs.reduce(
        (acc, log) =>
          acc +
          log.sets.reduce(
            (setAcc: number, s: any) => setAcc + (s.weight || 0) * s.reps,
            0
          ),
        0
      ),
      lastPerformed: recentLogs[0]?.workoutLog.completedAt || null,
      frequencyLast30Days: recentLogs.filter((log) => {
        const completedAt = log.workoutLog.completedAt;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return completedAt >= thirtyDaysAgo;
      }).length,
    };

    return NextResponse.json({ exercise, stats, recentLogs });
  } catch (error) {
    console.error('GET /api/exercises/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise' },
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

    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    if (exercise.createdByUserId && exercise.createdByUserId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to edit this exercise' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, instructions, type, difficulty, categoryId, muscleGroupIds, equipmentId, imageUrl, videoUrl } = body;

    const updated = await prisma.exercise.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(type && { type }),
        ...(difficulty && { difficulty }),
        ...(categoryId !== undefined && { categoryId }),
        ...(equipmentId !== undefined && { equipmentId }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(muscleGroupIds && {
          muscleGroups: {
            set: muscleGroupIds.map((id: string) => ({ id })),
          },
        }),
      },
      include: {
        category: true,
        muscleGroups: true,
        equipment: true,
      },
    });

    return NextResponse.json({ exercise: updated });
  } catch (error) {
    console.error('PUT /api/exercises/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update exercise' },
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

    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
    });

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    if (!exercise.isCustom || exercise.createdByUserId !== user.id) {
      return NextResponse.json(
        { error: 'Cannot delete built-in exercises' },
        { status: 403 }
      );
    }

    await prisma.exercise.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Exercise deactivated' });
  } catch (error) {
    console.error('DELETE /api/exercises/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete exercise' },
      { status: 500 }
    );
  }
}
