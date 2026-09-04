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
    const period = searchParams.get('period') || 'weekly';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let startDate = new Date();
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'alltime':
        startDate = new Date('2000-01-01');
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const workoutLogs = await prisma.workoutLog.findMany({
      where: {
        completedAt: { gte: startDate },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const userStats: Record<string, any> = {};

    workoutLogs.forEach((log) => {
      if (!userStats[log.userId]) {
        userStats[log.userId] = {
          user: log.user,
          totalWorkouts: 0,
          totalMinutes: 0,
          totalCalories: 0,
          totalVolume: 0,
        };
      }
      userStats[log.userId].totalWorkouts++;
      userStats[log.userId].totalMinutes += log.duration;
      userStats[log.userId].totalCalories += log.caloriesBurned;
      userStats[log.userId].totalVolume += log.totalVolume;
    });

    const sortedByWorkouts = Object.values(userStats)
      .sort((a: any, b: any) => b.totalWorkouts - a.totalWorkouts)
      .map((stats: any, index) => ({
        rank: index + 1,
        ...stats,
        points: calculatePoints(stats),
      }));

    const totalPoints = sortedByWorkouts.reduce(
      (acc: number, entry: any) => acc + entry.points,
      0
    );

    const leaderboard = sortedByWorkouts.map((entry: any) => ({
      ...entry,
      normalizedScore: totalPoints > 0
        ? Math.round((entry.points / totalPoints) * 100)
        : 0,
    }));

    const userRank = leaderboard.findIndex(
      (entry: any) => entry.user.id === user.id
    ) + 1;

    const userEntry = leaderboard.find(
      (entry: any) => entry.user.id === user.id
    );

    const overallStats = await prisma.userStats.findMany({
      orderBy: [
        { totalWorkouts: 'desc' },
        { longestStreak: 'desc' },
      ],
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      take: 100,
    });

    const overallLeaderboard = overallStats.map((stats, index) => ({
      rank: index + 1,
      user: stats.user,
      totalWorkouts: stats.totalWorkouts,
      totalMinutes: stats.totalMinutes,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      points: stats.totalWorkouts * 100 + stats.longestStreak * 50 + stats.totalMinutes,
    }));

    return NextResponse.json({
      period,
      leaderboard: leaderboard.slice((page - 1) * limit, page * limit),
      userRank: userRank || null,
      userEntry: userEntry || null,
      overallLeaderboard: overallLeaderboard.slice(0, 10),
      stats: {
        totalParticipants: leaderboard.length,
        averageWorkouts: leaderboard.length > 0
          ? Math.round(
              leaderboard.reduce((acc: number, e: any) => acc + e.totalWorkouts, 0) /
                leaderboard.length * 10
            ) / 10
          : 0,
        totalWorkoutsLogged: workoutLogs.length,
      },
      pagination: {
        page,
        limit,
        total: leaderboard.length,
        totalPages: Math.ceil(leaderboard.length / limit),
        hasMore: page * limit < leaderboard.length,
      },
    });
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

function calculatePoints(stats: any): number {
  const workoutPoints = stats.totalWorkouts * 100;
  const durationPoints = Math.floor(stats.totalMinutes / 10) * 10;
  const caloriePoints = Math.floor(stats.totalCalories / 100) * 15;
  const volumePoints = Math.floor(stats.totalVolume / 1000) * 20;
  return workoutPoints + durationPoints + caloriePoints + volumePoints;
}
