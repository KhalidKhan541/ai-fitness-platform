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
    const range = searchParams.get('range') || 'month';

    let startDate = new Date();
    switch (range) {
      case 'week': startDate.setDate(startDate.getDate() - 7); break;
      case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3months': startDate.setMonth(startDate.getMonth() - 3); break;
      case '6months': startDate.setMonth(startDate.getMonth() - 6); break;
      case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setMonth(startDate.getMonth() - 1);
    }

    const [
      weightEntries,
      measurementEntries,
      photoEntries,
      workoutLogs,
      userStats,
    ] = await Promise.all([
      prisma.weightEntry.findMany({
        where: { userId: user.id, recordedAt: { gte: startDate } },
        orderBy: { recordedAt: 'asc' },
        select: { weight: true, recordedAt: true, bodyFatPercentage: true },
      }),
      prisma.bodyMeasurement.findMany({
        where: { userId: user.id, recordedAt: { gte: startDate } },
        orderBy: { recordedAt: 'asc' },
        select: { chest: true, waist: true, hips: true, recordedAt: true },
      }),
      prisma.progressPhoto.findMany({
        where: { userId: user.id, recordedAt: { gte: startDate } },
        orderBy: { recordedAt: 'asc' },
        select: { id: true, recordedAt: true, type: true },
      }),
      prisma.workoutLog.findMany({
        where: { userId: user.id, completedAt: { gte: startDate } },
        orderBy: { completedAt: 'asc' },
        select: {
          duration: true,
          caloriesBurned: true,
          totalVolume: true,
          rating: true,
          completedAt: true,
        },
      }),
      prisma.userStats.findUnique({
        where: { userId: user.id },
      }),
    ]);

    const weightStats = weightEntries.length > 0
      ? {
          start: weightEntries[0].weight,
          current: weightEntries[weightEntries.length - 1].weight,
          change: weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight,
          changePercent: Math.round(
            ((weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight) /
              weightEntries[0].weight) *
              100 *
              10
          ) / 10,
          average: Math.round(
            weightEntries.reduce((acc, e) => acc + e.weight, 0) / weightEntries.length * 10
          ) / 10,
          entries: weightEntries.length,
        }
      : null;

    const workoutStats = workoutLogs.length > 0
      ? {
          totalWorkouts: workoutLogs.length,
          totalMinutes: workoutLogs.reduce((acc, l) => acc + l.duration, 0),
          totalCalories: workoutLogs.reduce((acc, l) => acc + l.caloriesBurned, 0),
          totalVolume: workoutLogs.reduce((acc, l) => acc + l.totalVolume, 0),
          averageDuration: Math.round(
            workoutLogs.reduce((acc, l) => acc + l.duration, 0) / workoutLogs.length
          ),
          averageCalories: Math.round(
            workoutLogs.reduce((acc, l) => acc + l.caloriesBurned, 0) / workoutLogs.length
          ),
          averageRating: workoutLogs.filter((l) => l.rating).length > 0
            ? (
                workoutLogs.reduce((acc, l) => acc + (l.rating || 0), 0) /
                workoutLogs.filter((l) => l.rating).length
              ).toFixed(1)
            : null,
          weeklyFrequency: Math.round(
            (workoutLogs.length / Math.max(1, Math.ceil(
              (new Date().getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
            ))) * 10
          ) / 10,
        }
      : null;

    const measurementStats = measurementEntries.length >= 2
      ? {
          chest: {
            start: measurementEntries[0].chest,
            current: measurementEntries[measurementEntries.length - 1].chest,
            change: (measurementEntries[measurementEntries.length - 1].chest || 0) - (measurementEntries[0].chest || 0),
          },
          waist: {
            start: measurementEntries[0].waist,
            current: measurementEntries[measurementEntries.length - 1].waist,
            change: (measurementEntries[measurementEntries.length - 1].waist || 0) - (measurementEntries[0].waist || 0),
          },
          hips: {
            start: measurementEntries[0].hips,
            current: measurementEntries[measurementEntries.length - 1].hips,
            change: (measurementEntries[measurementEntries.length - 1].hips || 0) - (measurementEntries[0].hips || 0),
          },
        }
      : null;

    const weeklyProgress = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() - 7);

      const weekWorkouts = workoutLogs.filter(
        (l) =>
          new Date(l.completedAt) >= weekEnd &&
          new Date(l.completedAt) < weekStart
      );

      weeklyProgress.unshift({
        weekStart: weekStart.toISOString().split('T')[0],
        workouts: weekWorkouts.length,
        minutes: weekWorkouts.reduce((acc, l) => acc + l.duration, 0),
        calories: weekWorkouts.reduce((acc, l) => acc + l.caloriesBurned, 0),
        volume: weekWorkouts.reduce((acc, l) => acc + l.totalVolume, 0),
      });
    }

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const achievements = await prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      range,
      weight: weightStats,
      workouts: workoutStats,
      measurements: measurementStats,
      photos: {
        total: photoEntries.length,
        firstPhoto: photoEntries[0]?.recordedAt || null,
        lastPhoto: photoEntries[photoEntries.length - 1]?.recordedAt || null,
      },
      weeklyProgress,
      overallStats: userStats,
      recentGoals: goals,
      recentAchievements: achievements,
      summary: {
        weightChange: weightStats?.change || null,
        totalWorkouts: workoutStats?.totalWorkouts || 0,
        totalMinutes: workoutStats?.totalMinutes || 0,
        currentStreak: userStats?.currentStreak || 0,
        longestStreak: userStats?.longestStreak || 0,
        totalAchievements: achievements.length,
      },
    });
  } catch (error) {
    console.error('GET /api/progress/summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress summary' },
      { status: 500 }
    );
  }
}
