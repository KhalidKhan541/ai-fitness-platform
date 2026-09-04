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
    const range = searchParams.get('range') || 'week';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    let startDate = new Date();
    switch (range) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const [
      workoutLogs,
      meals,
      weightEntries,
      achievements,
      socialActivity,
    ] = await Promise.all([
      prisma.workoutLog.findMany({
        where: {
          userId: user.id,
          completedAt: { gte: startDate },
        },
        include: {
          workout: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.meal.findMany({
        where: {
          userId: user.id,
          date: { gte: startDate },
        },
        include: {
          foods: {
            include: {
              food: { select: { name: true, caloriesPerServing: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.weightEntry.findMany({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.achievement.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.findMany({
        where: {
          authorId: user.id,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          type: true,
          content: true,
          createdAt: true,
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const timeline = [];

    workoutLogs.forEach((log) => {
      timeline.push({
        id: log.id,
        type: 'workout',
        title: `Completed ${log.workout.name}`,
        subtitle: `${log.duration} min · ${log.caloriesBurned} cal`,
        icon: '🏋️',
        date: log.completedAt,
        metadata: {
          workoutType: log.workout.type,
          rating: log.rating,
          feeling: log.feeling,
        },
      });
    });

    meals.forEach((meal) => {
      const totalCalories = meal.foods.reduce(
        (acc, mf) => acc + mf.food.caloriesPerServing * mf.servingSize * mf.quantity,
        0
      );
      timeline.push({
        id: meal.id,
        type: 'meal',
        title: `Logged ${meal.name}`,
        subtitle: `${Math.round(totalCalories)} cal · ${meal.type}`,
        icon: '🍽️',
        date: meal.date,
        metadata: {
          mealType: meal.type,
          foodCount: meal.foods.length,
        },
      });
    });

    weightEntries.forEach((entry) => {
      timeline.push({
        id: entry.id,
        type: 'weight',
        title: `Logged weight: ${entry.weight}kg`,
        subtitle: entry.bodyFatPercentage ? `${entry.bodyFatPercentage}% body fat` : '',
        icon: '⚖️',
        date: entry.recordedAt,
        metadata: {
          weight: entry.weight,
          bodyFat: entry.bodyFatPercentage,
        },
      });
    });

    achievements.forEach((achievement) => {
      timeline.push({
        id: achievement.id,
        type: 'achievement',
        title: `Earned: ${achievement.title}`,
        subtitle: `+${achievement.points} points`,
        icon: achievement.icon,
        date: achievement.createdAt,
        metadata: {
          points: achievement.points,
          type: achievement.type,
        },
      });
    });

    socialActivity.forEach((post) => {
      timeline.push({
        id: post.id,
        type: 'social',
        title: 'Shared a post',
        subtitle: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        icon: '📱',
        date: post.createdAt,
        metadata: {
          likes: post._count.likes,
          comments: post._count.comments,
        },
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

    const dailyBreakdown = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayWorkouts = workoutLogs.filter(
        (l) => new Date(l.completedAt) >= date && new Date(l.completedAt) < nextDate
      );
      const dayMeals = meals.filter(
        (m) => new Date(m.date) >= date && new Date(m.date) < nextDate
      );

      dailyBreakdown.unshift({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        workouts: dayWorkouts.length,
        calories: dayMeals.reduce(
          (acc, meal) =>
            acc +
            meal.foods.reduce(
              (mAcc, mf) =>
                mAcc + mf.food.caloriesPerServing * mf.servingSize * mf.quantity,
              0
            ),
          0
        ),
        minutes: dayWorkouts.reduce((acc, l) => acc + l.duration, 0),
        meals: dayMeals.length,
      });
    }

    return NextResponse.json({
      timeline: paginatedTimeline,
      dailyBreakdown,
      summary: {
        totalActivities: timeline.length,
        workouts: workoutLogs.length,
        meals: meals.length,
        weightEntries: weightEntries.length,
        achievements: achievements.length,
        socialPosts: socialActivity.length,
      },
      pagination: {
        page,
        limit,
        total: timeline.length,
        totalPages: Math.ceil(timeline.length / limit),
        hasMore: page * limit < timeline.length,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
