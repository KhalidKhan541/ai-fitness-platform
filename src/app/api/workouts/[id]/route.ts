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

    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                category: true,
                muscleGroups: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        tags: true,
        logs: {
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { logs: true },
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const stats = {
      totalExercises: workout.exercises.length,
      totalSets: workout.exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0),
      estimatedDuration: workout.duration,
      averageCompletionTime: null as number | null,
      personalBests: {} as Record<string, any>,
    };

    if (workout.logs.length > 0) {
      const completionTimes = workout.logs
        .filter((log) => log.duration)
        .map((log) => log.duration);
      if (completionTimes.length > 0) {
        stats.averageCompletionTime = Math.round(
          completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        );
      }

      workout.exercises.forEach((we) => {
        const exerciseLogs = workout.logs.flatMap((log) =>
          log.exerciseLogs?.filter((el) => el.exerciseId === we.exerciseId) || []
        );
        if (exerciseLogs.length > 0) {
          const maxWeight = Math.max(...exerciseLogs.map((el) => el.weight || 0));
          const maxReps = Math.max(...exerciseLogs.map((el) => el.reps || 0));
          stats.personalBests[we.exerciseId] = { maxWeight, maxReps };
        }
      });
    }

    return NextResponse.json({ workout, stats });
  } catch (error) {
    console.error('GET /api/workouts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout' },
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

    const body = await request.json();
    const { exercises, tags, ...updateData } = body;

    const existing = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const workout = await prisma.$transaction(async (tx) => {
      if (exercises) {
        await tx.workoutExercise.deleteMany({
          where: { workoutId: params.id },
        });
      }
      if (tags) {
        await tx.workoutTag.deleteMany({
          where: { workoutId: params.id },
        });
      }

      return tx.workout.update({
        where: { id: params.id },
        data: {
          ...updateData,
          exercises: exercises
            ? {
                create: exercises.map((ex: any) => ({
                  exerciseId: ex.exerciseId,
                  sets: ex.sets || 3,
                  reps: ex.reps || 10,
                  weight: ex.weight || 0,
                  duration: ex.duration || 0,
                  distance: ex.distance || 0,
                  restSeconds: ex.restSeconds || 60,
                  order: ex.order,
                  notes: ex.notes || '',
                })),
              }
            : undefined,
          tags: tags
            ? {
                create: tags.map((tag: string) => ({
                  name: tag.toLowerCase().trim(),
                })),
              }
            : undefined,
        },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
          tags: true,
        },
      });
    });

    return NextResponse.json({ workout });
  } catch (error) {
    console.error('PUT /api/workouts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update workout' },
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

    const existing = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const logs = await tx.workoutLog.findMany({
        where: { workoutId: params.id },
        select: { id: true },
      });
      const logIds = logs.map((l) => l.id);

      if (logIds.length > 0) {
        await tx.exerciseLog.deleteMany({
          where: { workoutLogId: { in: logIds } },
        });
      }

      await tx.workoutExercise.deleteMany({ where: { workoutId: params.id } });
      await tx.workoutTag.deleteMany({ where: { workoutId: params.id } });
      await tx.workoutLog.deleteMany({ where: { workoutId: params.id } });
      await tx.workout.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'Workout deleted' });
  } catch (error) {
    console.error('DELETE /api/workouts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout' },
      { status: 500 }
    );
  }
}
