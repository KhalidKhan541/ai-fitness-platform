import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const logSetSchema = z.object({
  exerciseLogs: z.array(z.object({
    exerciseId: z.string(),
    sets: z.array(z.object({
      setNumber: z.number().min(1),
      reps: z.number().min(0).max(200),
      weight: z.number().min(0).max(1000).optional(),
      duration: z.number().min(0).max(7200).optional(),
      distance: z.number().min(0).max(100).optional(),
      rpe: z.number().min(1).max(10).optional(),
      completed: z.boolean().default(true),
      notes: z.string().max(100).optional(),
    })),
  })).min(1),
  duration: z.number().min(0).max(7200).optional(),
  caloriesBurned: z.number().min(0).max(5000).optional(),
  heartRateAvg: z.number().min(30).max(250).optional(),
  heartRateMax: z.number().min(30).max(250).optional(),
  notes: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).optional(),
  feeling: z.enum(['great', 'good', 'okay', 'tired', 'exhausted']).optional(),
});

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const [logs, total] = await Promise.all([
      prisma.workoutLog.findMany({
        where: { workoutId: params.id },
        include: {
          exerciseLogs: {
            include: { exercise: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workoutLog.count({
        where: { workoutId: params.id },
      }),
    ]);

    const logsWithStats = logs.map((log) => {
      const totalVolume = log.exerciseLogs.reduce((acc, el) => {
        return acc + (el.weight || 0) * (el.reps || 0);
      }, 0);

      const totalSets = log.exerciseLogs.reduce((acc, el) => {
        return acc + el.sets.filter((s) => s.completed).length;
      }, 0);

      return {
        ...log,
        stats: {
          totalVolume,
          totalSets,
          exerciseCount: log.exerciseLogs.length,
        },
      };
    });

    return NextResponse.json({
      logs: logsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/workouts/[id]/log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout logs' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = logSetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { exerciseLogs, duration, caloriesBurned, heartRateAvg, heartRateMax, notes, rating, feeling } = validation.data;

    const totalVolume = exerciseLogs.reduce((acc, el) => {
      return acc + el.sets.reduce((setAcc, set) => {
        return setAcc + (set.weight || 0) * set.reps;
      }, 0);
    }, 0);

    const totalSets = exerciseLogs.reduce((acc, el) => {
      return acc + el.sets.filter((s) => s.completed).length;
    }, 0);

    const totalReps = exerciseLogs.reduce((acc, el) => {
      return acc + el.sets.reduce((setAcc, set) => setAcc + set.reps, 0);
    }, 0);

    const workoutLog = await prisma.$transaction(async (tx) => {
      const log = await tx.workoutLog.create({
        data: {
          workoutId: params.id,
          userId: user.id,
          completedAt: new Date(),
          duration: duration || 0,
          caloriesBurned: caloriesBurned || 0,
          totalVolume,
          totalSets,
          totalReps,
          heartRateAvg: heartRateAvg || null,
          heartRateMax: heartRateMax || null,
          notes: notes || '',
          rating: rating || null,
          feeling: feeling || null,
        },
      });

      for (const el of exerciseLogs) {
        await tx.exerciseLog.create({
          data: {
            workoutLogId: log.id,
            exerciseId: el.exerciseId,
            sets: el.sets,
          },
        });
      }

      return log;
    });

    await prisma.userStats.update({
      where: { userId: user.id },
      data: {
        totalWorkouts: { increment: 1 },
        totalMinutes: { increment: Math.round((duration || 0) / 60) },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await prisma.workoutLog.count({
      where: {
        userId: user.id,
        completedAt: { gte: today },
      },
    });

    if (todayLogs === 1) {
      await prisma.userStats.update({
        where: { userId: user.id },
        data: {
          currentStreak: { increment: 1 },
        },
      });
    }

    const responseLog = await prisma.workoutLog.findUnique({
      where: { id: workoutLog.id },
      include: {
        exerciseLogs: {
          include: { exercise: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Workout logged successfully',
        log: responseLog,
        stats: {
          totalVolume,
          totalSets,
          totalReps,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/workouts/[id]/log error:', error);
    return NextResponse.json(
      { error: 'Failed to log workout' },
      { status: 500 }
    );
  }
}
