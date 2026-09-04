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

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      userStats,
      todayWorkouts,
      weekWorkouts,
      monthWorkouts,
      todayMeals,
      recentWeight,
      activeGoals,
      recentAchievements,
      pendingNotifications,
      activeChallenges,
    ] = await Promise.all([
      prisma.userStats.findUnique({ where: { userId: user.id } }),
      prisma.workoutLog.findMany({
        where: {
          userId: user.id,
          completedAt: { gte: today, lt: tomorrow },
        },
        include: { workout: { select: { name: true } } },
      }),
      prisma.workoutLog.count({
        where: {
          userId: user.id,
          completedAt: { gte: weekAgo },
        },
      }),
      prisma.workoutLog.count({
        where: {
          userId: user.id,
          completedAt: { gte: monthAgo },
        },
      }),
      prisma.meal.findMany({
        where: {
          userId: user.id,
          date: { gte: today, lt: tomorrow },
        },
        include: {
          foods: {
            include: { food: { select: { caloriesPerServing: true, proteinPerServing: true, carbsPerServing: true, fatPerServing: true } } },
          },
        },
      }),
      prisma.weightEntry.findFirst({
        where: { userId: user.id },
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.goal.findMany({
        where: { userId: user.id, status: 'active' },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.achievement.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
      prisma.challengeParticipant.findMany({
        where: {
          userId: user.id,
          challenge: {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
        include: {
          challenge: {
            select: { id: true, title: true, endDate: true },
          },
        },
        take: 3,
      }),
    ]);

    const todayCalories = todayMeals.reduce(
      (acc, meal) =>
        acc +
        meal.foods.reduce(
          (mealAcc, mf) =>
            mealAcc + mf.food.caloriesPerServing * mf.servingSize * mf.quantity,
          0
        ),
      0
    );

    const todayProtein = todayMeals.reduce(
      (acc, meal) =>
        acc +
        meal.foods.reduce(
          (mealAcc, mf) =>
            mealAcc + mf.food.proteinPerServing * mf.servingSize * mf.quantity,
          0
        ),
      0
    );

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
      select: {
        dailyCalorieGoal: true,
        dailyProteinGoal: true,
        dailyWaterGoal: true,
      },
    });

    const waterLogs = await prisma.waterLog.findMany({
      where: {
        userId: user.id,
        loggedAt: { gte: today, lt: tomorrow },
      },
    });

    const todayWater = waterLogs.reduce((acc, log) => acc + log.amountMl, 0);

    const quickStats = {
      todayWorkouts: todayWorkouts.length,
      weekWorkouts,
      monthWorkouts,
      totalWorkouts: userStats?.totalWorkouts || 0,
      currentStreak: userStats?.currentStreak || 0,
      longestStreak: userStats?.longestStreak || 0,
      totalMinutes: userStats?.totalMinutes || 0,
    };

    const nutritionSummary = {
      calories: {
        consumed: Math.round(todayCalories),
        goal: preferences?.dailyCalorieGoal || 2000,
        remaining: Math.round((preferences?.dailyCalorieGoal || 2000) - todayCalories),
      },
      protein: {
        consumed: Math.round(todayProtein),
        goal: preferences?.dailyProteinGoal || 150,
      },
      water: {
        consumedMl: todayWater,
        goalMl: preferences?.dailyWaterGoal || 2500,
      },
      mealsLogged: todayMeals.length,
    };

    const recentActivity = todayWorkouts.map((w) => ({
      type: 'workout',
      title: `Completed ${w.workout.name}`,
      time: w.completedAt,
      calories: w.caloriesBurned,
      duration: w.duration,
    }));

    return NextResponse.json({
      quickStats,
      nutritionSummary,
      recentActivity,
      currentWeight: recentWeight?.weight || null,
      activeGoals: activeGoals.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        progress: g.progress,
      })),
      recentAchievements: recentAchievements.map((a) => ({
        id: a.id,
        title: a.title,
        icon: a.icon,
        points: a.points,
        date: a.createdAt,
      })),
      activeChallenges: activeChallenges.map((cp) => ({
        id: cp.challenge.id,
        title: cp.challenge.title,
        progress: cp.progress,
        endDate: cp.challenge.endDate,
      })),
      notifications: {
        unread: pendingNotifications,
      },
      todaySchedule: {
        workoutsCompleted: todayWorkouts.length,
        mealsLogged: todayMeals.length,
        waterIntake: todayWater,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
