import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const completeSchema = z.object({
  duration: z.number().min(0).max(7200).optional(),
  caloriesBurned: z.number().min(0).max(5000).optional(),
  rating: z.number().min(1).max(5).optional(),
  feeling: z.enum(['great', 'good', 'okay', 'tired', 'exhausted']).optional(),
  notes: z.string().max(500).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
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
      include: {
        exercises: true,
        logs: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = completeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { duration, caloriesBurned, rating, feeling, notes } = validation.data;

    const estimatedDuration = workout.duration;
    const estimatedCalories = workout.exercises.length * 50;

    const completionData = {
      duration: duration || estimatedDuration,
      caloriesBurned: caloriesBurned || estimatedCalories,
      rating: rating || null,
      feeling: feeling || null,
      notes: notes || '',
    };

    const workoutLog = await prisma.workoutLog.create({
      data: {
        workoutId: params.id,
        userId: user.id,
        completedAt: new Date(),
        duration: completionData.duration,
        caloriesBurned: completionData.caloriesBurned,
        totalVolume: 0,
        totalSets: workout.exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0),
        totalReps: workout.exercises.reduce(
          (acc, ex) => acc + (ex.sets || 0) * (ex.reps || 0),
          0
        ),
        notes: completionData.notes,
        rating: completionData.rating,
        feeling: completionData.feeling,
      },
    });

    await prisma.userStats.update({
      where: { userId: user.id },
      data: {
        totalWorkouts: { increment: 1 },
        totalMinutes: {
          increment: Math.round(completionData.duration / 60),
        },
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

    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id,
        type: 'workout_count',
        status: 'active',
      },
    });

    const updatedGoals = [];
    for (const goal of goals) {
      const currentCount = await prisma.workoutLog.count({
        where: {
          userId: user.id,
          completedAt: {
            gte: goal.startDate,
            lte: goal.endDate || new Date(),
          },
        },
      });

      const newProgress = Math.min(100, Math.round((currentCount / goal.targetValue) * 100));

      const updatedGoal = await prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentValue: currentCount,
          progress: newProgress,
          status: currentProgress >= 100 ? 'completed' : 'active',
        },
      });

      if (newProgress >= 100 && goal.status !== 'completed') {
        await prisma.achievement.create({
          data: {
            userId: user.id,
            type: 'goal_completed',
            title: 'Goal Achieved!',
            description: `Completed goal: ${goal.title}`,
            icon: '🎯',
            points: 100,
          },
        });
      }

      updatedGoals.push(updatedGoal);
    }

    let achievement = null;
    const totalWorkouts = await prisma.workoutLog.count({
      where: { userId: user.id },
    });

    const milestones = [1, 10, 25, 50, 100, 250, 500, 1000];
    if (milestones.includes(totalWorkouts)) {
      achievement = await prisma.achievement.create({
        data: {
          userId: user.id,
          type: 'milestone',
          title: `${totalWorkouts} Workouts Completed!`,
          description: `You've completed ${totalWorkouts} workouts. Keep pushing!`,
          icon: '💪',
          points: totalWorkouts * 10,
        },
      });
    }

    return NextResponse.json({
      message: 'Workout completed successfully',
      log: workoutLog,
      stats: {
        duration: completionData.duration,
        caloriesBurned: completionData.caloriesBurned,
        totalWorkouts,
      },
      goalsUpdated: updatedGoals.length,
      achievement: achievement || null,
    });
  } catch (error) {
    console.error('POST /api/workouts/[id]/complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete workout' },
      { status: 500 }
    );
  }
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
        logs: {
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
        _count: { select: { logs: true } },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const allLogs = await prisma.workoutLog.findMany({
      where: { workoutId: params.id },
      select: {
        duration: true,
        caloriesBurned: true,
        totalVolume: true,
        completedAt: true,
        rating: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    const stats = {
      totalCompletions: allLogs.length,
      averageDuration:
        allLogs.length > 0
          ? Math.round(
              allLogs.reduce((acc, l) => acc + l.duration, 0) / allLogs.length
            )
          : 0,
      averageCalories:
        allLogs.length > 0
          ? Math.round(
              allLogs.reduce((acc, l) => acc + l.caloriesBurned, 0) /
                allLogs.length
            )
          : 0,
      averageRating:
        allLogs.filter((l) => l.rating).length > 0
          ? (
              allLogs.reduce((acc, l) => acc + (l.rating || 0), 0) /
              allLogs.filter((l) => l.rating).length
            ).toFixed(1)
          : null,
      lastCompleted: allLogs[0]?.completedAt || null,
      personalBestVolume: Math.max(...allLogs.map((l) => l.totalVolume), 0),
    };

    return NextResponse.json({ workout, stats });
  } catch (error) {
    console.error('GET /api/workouts/[id]/complete error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completion stats' },
      { status: 500 }
    );
  }
}
