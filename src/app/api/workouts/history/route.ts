import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    const where: any = { userId: user.id };

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = new Date(startDate);
      if (endDate) where.completedAt.lte = new Date(endDate);
    }

    if (type) {
      where.workout = { type };
    }

    const [logs, total] = await Promise.all([
      prisma.workoutLog.findMany({
        where,
        include: {
          workout: {
            select: {
              id: true,
              name: true,
              type: true,
              difficulty: true,
              duration: true,
            },
          },
          exerciseLogs: {
            include: {
              exercise: {
                select: { name: true, category: true },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workoutLog.count({ where }),
    ]);

    const logsWithStats = logs.map((log) => ({
      id: log.id,
      completedAt: log.completedAt,
      duration: log.duration,
      caloriesBurned: log.caloriesBurned,
      totalVolume: log.totalVolume,
      totalSets: log.totalSets,
      totalReps: log.totalReps,
      rating: log.rating,
      feeling: log.feeling,
      notes: log.notes,
      workout: log.workout,
      exercises: log.exerciseLogs.map((el) => ({
        name: el.exercise.name,
        category: el.exercise.category,
        sets: el.sets,
        totalVolume: el.sets.reduce(
          (acc: number, s: any) => acc + (s.weight || 0) * s.reps,
          0
        ),
      })),
    }));

    const weeklyStats = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('week', "completedAt") as "weekStart",
        COUNT(*) as "workoutCount",
        SUM("duration") as "totalDuration",
        SUM("caloriesBurned") as "totalCalories",
        SUM("totalVolume") as "totalVolume",
        AVG("rating") as "avgRating"
      FROM "WorkoutLog"
      WHERE "userId" = ${user.id}
        AND "completedAt" >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', "completedAt")
      ORDER BY "weekStart" DESC
    `;

    const monthlyStats = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "completedAt") as "monthStart",
        COUNT(*) as "workoutCount",
        SUM("duration") as "totalDuration",
        SUM("caloriesBurned") as "totalCalories",
        SUM("totalVolume") as "totalVolume"
      FROM "WorkoutLog"
      WHERE "userId" = ${user.id}
        AND "completedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "completedAt")
      ORDER BY "monthStart" DESC
    `;

    return NextResponse.json({
      logs: logsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      stats: {
        weekly: weeklyStats,
        monthly: monthlyStats,
      },
    });
  } catch (error) {
    console.error('GET /api/workouts/history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout history' },
      { status: 500 }
    );
  }
}
