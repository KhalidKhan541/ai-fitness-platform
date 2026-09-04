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
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const where: any = { userId: user.id };
    if (type) where.type = type;

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.achievement.count({ where }),
    ]);

    const stats = {
      total: total,
      totalPoints: achievements.reduce((acc, a) => acc + a.points, 0),
      recentAchievements: achievements.slice(0, 5),
    };

    const allAchievements = await prisma.achievement.findMany({
      where: { userId: user.id },
      select: { type: true, points: true },
    });

    const byType = allAchievements.reduce((acc, a) => {
      if (!acc[a.type]) acc[a.type] = { count: 0, points: 0 };
      acc[a.type].count++;
      acc[a.type].points += a.points;
      return acc;
    }, {} as Record<string, { count: number; points: number }>);

    const allPossibleAchievements = [
      { type: 'milestone', title: 'First Workout', description: 'Complete your first workout', icon: '🏋️', points: 50, threshold: 1 },
      { type: 'milestone', title: '10 Workouts', description: 'Complete 10 workouts', icon: '💪', points: 100, threshold: 10 },
      { type: 'milestone', title: '50 Workouts', description: 'Complete 50 workouts', icon: '🔥', points: 250, threshold: 50 },
      { type: 'milestone', title: '100 Workouts', description: 'Complete 100 workouts', icon: '⭐', points: 500, threshold: 100 },
      { type: 'streak', title: '7 Day Streak', description: 'Work out 7 days in a row', icon: '🔥', points: 100, threshold: 7 },
      { type: 'streak', title: '30 Day Streak', description: 'Work out 30 days in a row', icon: '🌟', points: 500, threshold: 30 },
      { type: 'goal_completed', title: 'Goal Crusher', description: 'Complete your first goal', icon: '🎯', points: 150, threshold: 1 },
      { type: 'nutrition', title: 'Nutrition Tracker', description: 'Log meals for 7 days', icon: '🥗', points: 75, threshold: 7 },
      { type: 'social', title: 'Social Butterfly', description: 'Follow 10 users', icon: '👥', points: 50, threshold: 10 },
      { type: 'challenge', title: 'Challenge Accepted', description: 'Complete your first challenge', icon: '🏆', points: 200, threshold: 1 },
    ];

    const unlockedTypes = new Set(allAchievements.map((a) => a.type));

    const locked = allPossibleAchievements.filter(
      (a) => !unlockedTypes.has(a.type) || (byType[a.type]?.count || 0) < a.threshold
    );

    return NextResponse.json({
      achievements,
      stats: {
        ...stats,
        byType,
      },
      nextPossible: locked.slice(0, 5),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/achievements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
