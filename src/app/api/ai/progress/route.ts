import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const analysisSchema = z.object({
  timeframe: z.enum(['week', 'month', '3months', '6months', 'year']).optional(),
  metrics: z.array(z.enum([
    'weight', 'workouts', 'nutrition', 'measurements',
    'sleep', 'overall', 'trends', 'recommendations',
  ])).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

async function getProgressData(userId: string, startDate: Date) {
  const [
    weightEntries,
    workoutLogs,
    measurements,
    meals,
    goals,
    achievements,
    userStats,
  ] = await Promise.all([
    prisma.weightEntry.findMany({
      where: { userId, recordedAt: { gte: startDate } },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.workoutLog.findMany({
      where: { userId, completedAt: { gte: startDate } },
      include: { workout: { select: { name: true, type: true } } },
      orderBy: { completedAt: 'asc' },
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId, recordedAt: { gte: startDate } },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.meal.findMany({
      where: { userId, date: { gte: startDate } },
      include: { foods: { include: { food: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.achievement.findMany({
      where: { userId, createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userStats.findUnique({ where: { userId } }),
  ]);

  return { weightEntries, workoutLogs, measurements, meals, goals, achievements, userStats };
}

function analyzeWeightProgress(entries: any[]) {
  if (entries.length < 2) return null;

  const weights = entries.map((e) => e.weight);
  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const change = lastWeight - firstWeight;
  const changePercent = (change / firstWeight) * 100;

  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
  const volatility = Math.sqrt(
    weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length
  );

  const weeklyChanges: number[] = [];
  for (let i = 1; i < weights.length; i++) {
    weeklyChanges.push(weights[i] - weights[i - 1]);
  }
  const avgWeeklyChange = weeklyChanges.length > 0
    ? weeklyChanges.reduce((a, b) => a + b, 0) / weeklyChanges.length
    : 0;

  return {
    startWeight: firstWeight,
    currentWeight: lastWeight,
    totalChange: Math.round(change * 10) / 10,
    changePercent: Math.round(changePercent * 10) / 10,
    averageWeight: Math.round(avgWeight * 10) / 10,
    volatility: Math.round(volatility * 10) / 10,
    avgWeeklyChange: Math.round(avgWeeklyChange * 100) / 100,
    trend: change > 0.5 ? 'gaining' : change < -0.5 ? 'losing' : 'stable',
    consistency: volatility < 1 ? 'very_consistent' : volatility < 2 ? 'consistent' : 'variable',
  };
}

function analyzeWorkoutProgress(logs: any[]) {
  if (logs.length === 0) return null;

  const totalWorkouts = logs.length;
  const totalDuration = logs.reduce((acc, l) => acc + l.duration, 0);
  const totalCalories = logs.reduce((acc, l) => acc + l.caloriesBurned, 0);
  const totalVolume = logs.reduce((acc, l) => acc + l.totalVolume, 0);
  const ratings = logs.filter((l) => l.rating).map((l) => l.rating);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  const workoutsByType = logs.reduce((acc, l) => {
    const type = l.workout?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weeklyFrequency = totalWorkouts / Math.max(1, Math.ceil(
    (new Date().getTime() - new Date(logs[0].completedAt).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  ));

  const weeklyProgress: { week: string; count: number; duration: number }[] = [];
  const weekMap = new Map<string, { count: number; duration: number }>();

  logs.forEach((log) => {
    const weekStart = new Date(log.completedAt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { count: 0, duration: 0 });
    }
    const week = weekMap.get(weekKey)!;
    week.count++;
    week.duration += log.duration;
  });

  weekMap.forEach((value, key) => {
    weeklyProgress.push({ week: key, ...value });
  });

  return {
    totalWorkouts,
    totalDuration,
    totalCalories,
    totalVolume,
    averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    averageDuration: Math.round(totalDuration / totalWorkouts),
    averageCalories: Math.round(totalCalories / totalWorkouts),
    weeklyFrequency: Math.round(weeklyFrequency * 10) / 10,
    workoutsByType,
    weeklyProgress: weeklyProgress.sort((a, b) => a.week.localeCompare(b.week)),
    consistency: weeklyFrequency >= 4 ? 'excellent' : weeklyFrequency >= 3 ? 'good' : weeklyFrequency >= 2 ? 'fair' : 'needs_improvement',
  };
}

function analyzeNutritionProgress(meals: any[]) {
  if (meals.length === 0) return null;

  const dailyTotals = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

  meals.forEach((meal) => {
    const dateKey = new Date(meal.date).toISOString().split('T')[0];
    if (!dailyTotals.has(dateKey)) {
      dailyTotals.set(dateKey, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
    const day = dailyTotals.get(dateKey)!;
    meal.foods.forEach((mf: any) => {
      const multiplier = mf.servingSize * mf.quantity;
      day.calories += mf.food.caloriesPerServing * multiplier;
      day.protein += mf.food.proteinPerServing * multiplier;
      day.carbs += mf.food.carbsPerServing * multiplier;
      day.fat += mf.food.fatPerServing * multiplier;
    });
  });

  const days = Array.from(dailyTotals.values());
  const avgCalories = days.reduce((acc, d) => acc + d.calories, 0) / days.length;
  const avgProtein = days.reduce((acc, d) => acc + d.protein, 0) / days.length;

  const calorieConsistency = days.filter(
    (d) => Math.abs(d.calories - avgCalories) < avgCalories * 0.2
  ).length / days.length;

  return {
    totalDaysTracked: days.length,
    averageDailyCalories: Math.round(avgCalories),
    averageDailyProtein: Math.round(avgProtein),
    averageDailyCarbs: Math.round(days.reduce((acc, d) => acc + d.carbs, 0) / days.length),
    averageDailyFat: Math.round(days.reduce((acc, d) => acc + d.fat, 0) / days.length),
    calorieConsistency: Math.round(calorieConsistency * 100),
    trackingStreak: calculateTrackingStreak(meals),
  };
}

function calculateTrackingStreak(meals: any[]): number {
  const dates = [...new Set(meals.map((m) => new Date(m.date).toISOString().split('T')[0]))];
  dates.sort().reverse();

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expected = expectedDate.toISOString().split('T')[0];

    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function generateRecommendations(analysis: any): string[] {
  const recommendations: string[] = [];

  if (analysis.workouts) {
    if (analysis.workouts.weeklyFrequency < 3) {
      recommendations.push('Try to increase your workout frequency to at least 3 times per week');
    }
    if (analysis.workouts.consistency === 'needs_improvement') {
      recommendations.push('Focus on building a consistent workout routine');
    }
  }

  if (analysis.nutrition) {
    if (analysis.nutrition.calorieConsistency < 70) {
      recommendations.push('Try to maintain more consistent daily calorie intake');
    }
    if (analysis.nutrition.averageDailyProtein < 100) {
      recommendations.push('Consider increasing your protein intake for better muscle recovery');
    }
  }

  if (analysis.weight) {
    if (analysis.weight.volatility > 2) {
      recommendations.push('Your weight fluctuates a lot - focus on weekly averages rather than daily changes');
    }
    if (Math.abs(analysis.weight.avgWeeklyChange) > 1) {
      recommendations.push('Your weight change is rapid - consider a more gradual approach for sustainability');
    }
  }

  recommendations.push('Keep tracking your progress consistently');
  recommendations.push('Focus on progressive overload in your workouts');

  return recommendations;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = analysisSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { timeframe = 'month', metrics } = validation.data;

    let startDate = new Date();
    switch (timeframe) {
      case 'week': startDate.setDate(startDate.getDate() - 7); break;
      case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3months': startDate.setMonth(startDate.getMonth() - 3); break;
      case '6months': startDate.setMonth(startDate.getMonth() - 6); break;
      case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
    }

    const data = await getProgressData(user.id, startDate);

    const requestedMetrics = metrics || ['weight', 'workouts', 'nutrition', 'overall', 'recommendations'];

    const analysis: any = { timeframe, analyzedAt: new Date().toISOString() };

    if (requestedMetrics.includes('weight')) {
      analysis.weight = analyzeWeightProgress(data.weightEntries);
    }

    if (requestedMetrics.includes('workouts')) {
      analysis.workouts = analyzeWorkoutProgress(data.workoutLogs);
    }

    if (requestedMetrics.includes('nutrition')) {
      analysis.nutrition = analyzeNutritionProgress(data.meals);
    }

    if (requestedMetrics.includes('overall')) {
      analysis.overall = {
        totalWorkouts: data.userStats?.totalWorkouts || 0,
        totalMinutes: data.userStats?.totalMinutes || 0,
        currentStreak: data.userStats?.currentStreak || 0,
        longestStreak: data.userStats?.longestStreak || 0,
        activeGoals: data.goals.filter((g) => g.status === 'active').length,
        completedGoals: data.goals.filter((g) => g.status === 'completed').length,
        achievementsEarned: data.achievements.length,
        totalAchievementPoints: data.achievements.reduce((acc, a) => acc + a.points, 0),
      };
    }

    if (requestedMetrics.includes('trends')) {
      analysis.trends = {
        weightTrend: analysis.weight?.trend || 'insufficient_data',
        workoutFrequency: analysis.workouts?.weeklyFrequency || 0,
        nutritionConsistency: analysis.nutrition?.calorieConsistency || 0,
      };
    }

    if (requestedMetrics.includes('recommendations')) {
      analysis.recommendations = generateRecommendations(analysis);
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('POST /api/ai/progress error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getProgressData(user.id, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    return NextResponse.json({
      hasData: {
        weight: data.weightEntries.length > 0,
        workouts: data.workoutLogs.length > 0,
        nutrition: data.meals.length > 0,
        measurements: data.measurements.length > 0,
      },
      summary: {
        weightEntries: data.weightEntries.length,
        workoutsCompleted: data.workoutLogs.length,
        mealsLogged: data.meals.length,
        measurementsTaken: data.measurements.length,
      },
    });
  } catch (error) {
    console.error('GET /api/ai/progress error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
}
