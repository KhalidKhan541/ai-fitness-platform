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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const range = searchParams.get('range') || 'day';

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
      select: {
        dailyCalorieGoal: true,
        dailyProteinGoal: true,
        dailyCarbGoal: true,
        dailyFatGoal: true,
      },
    });

    const targets = {
      calories: preferences?.dailyCalorieGoal || 2000,
      protein: preferences?.dailyProteinGoal || 150,
      carbs: preferences?.dailyCarbGoal || 250,
      fat: preferences?.dailyFatGoal || 65,
    };

    if (range === 'day') {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const meals = await prisma.meal.findMany({
        where: {
          userId: user.id,
          date: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          foods: { include: { food: true } },
        },
      });

      const totals = calculateDailyTotals(meals);

      const mealBreakdown = ['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
        const typeMeals = meals.filter((m) => m.type === type);
        const typeNutrition = calculateDailyTotals(typeMeals);
        return { type, ...typeNutrition, mealCount: typeMeals.length };
      });

      const waterLogs = await prisma.waterLog.findMany({
        where: {
          userId: user.id,
          loggedAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      const waterTotal = waterLogs.reduce((acc, log) => acc + log.amountMl, 0);

      return NextResponse.json({
        date,
        totals,
        targets,
        progress: {
          calories: Math.round((totals.calories / targets.calories) * 100),
          protein: Math.round((totals.protein / targets.protein) * 100),
          carbs: Math.round((totals.carbs / targets.carbs) * 100),
          fat: Math.round((totals.fat / targets.fat) * 100),
        },
        mealBreakdown,
        water: {
          totalMl: waterTotal,
          goalMl: 2500,
          progress: Math.round((waterTotal / 2500) * 100),
        },
        macros: {
          proteinCalories: totals.protein * 4,
          carbCalories: totals.carbs * 4,
          fatCalories: totals.fat * 9,
          proteinPercent: totals.calories > 0 ? Math.round(((totals.protein * 4) / totals.calories) * 100) : 0,
          carbPercent: totals.calories > 0 ? Math.round(((totals.carbs * 4) / totals.calories) * 100) : 0,
          fatPercent: totals.calories > 0 ? Math.round(((totals.fat * 9) / totals.calories) * 100) : 0,
        },
      });
    }

    if (range === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const dailyData = await prisma.$queryRaw`
        SELECT
          DATE(m."date") as "date",
          SUM(f."caloriesPerServing" * mf."servingSize" * mf."quantity") as "totalCalories",
          SUM(f."proteinPerServing" * mf."servingSize" * mf."quantity") as "totalProtein",
          SUM(f."carbsPerServing" * mf."servingSize" * mf."quantity") as "totalCarbs",
          SUM(f."fatPerServing" * mf."servingSize" * mf."quantity") as "totalFat"
        FROM "Meal" m
        JOIN "MealFood" mf ON m."id" = mf."mealId"
        JOIN "Food" f ON mf."foodId" = f."id"
        WHERE m."userId" = ${user.id}
          AND m."date" >= ${weekAgo}
        GROUP BY DATE(m."date")
        ORDER BY "date" ASC
      `;

      const weeklyAverages = dailyData.length > 0
        ? {
            calories: Math.round(dailyData.reduce((acc: number, d: any) => acc + Number(d.totalCalories), 0) / dailyData.length),
            protein: Math.round(dailyData.reduce((acc: number, d: any) => acc + Number(d.totalProtein), 0) / dailyData.length),
            carbs: Math.round(dailyData.reduce((acc: number, d: any) => acc + Number(d.totalCarbs), 0) / dailyData.length),
            fat: Math.round(dailyData.reduce((acc: number, d: any) => acc + Number(d.totalFat), 0) / dailyData.length),
          }
        : { calories: 0, protein: 0, carbs: 0, fat: 0 };

      return NextResponse.json({
        range: 'week',
        dailyData,
        weeklyAverages,
        targets,
        daysOnTarget: dailyData.filter((d: any) =>
          Number(d.totalCalories) >= targets.calories * 0.9 &&
          Number(d.totalCalories) <= targets.calories * 1.1
        ).length,
      });
    }

    if (range === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const dailyData = await prisma.$queryRaw`
        SELECT
          DATE(m."date") as "date",
          SUM(f."caloriesPerServing" * mf."servingSize" * mf."quantity") as "totalCalories",
          SUM(f."proteinPerServing" * mf."servingSize" * mf."quantity") as "totalProtein",
          SUM(f."carbsPerServing" * mf."servingSize" * mf."quantity") as "totalCarbs",
          SUM(f."fatPerServing" * mf."servingSize" * mf."quantity") as "totalFat"
        FROM "Meal" m
        JOIN "MealFood" mf ON m."id" = mf."mealId"
        JOIN "Food" f ON mf."foodId" = f."id"
        WHERE m."userId" = ${user.id}
          AND m."date" >= ${monthAgo}
        GROUP BY DATE(m."date")
        ORDER BY "date" ASC
      `;

      return NextResponse.json({
        range: 'month',
        dailyData,
        targets,
      });
    }

    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/nutrition/summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition summary' },
      { status: 500 }
    );
  }
}

function calculateDailyTotals(meals: any[]) {
  return meals.reduce(
    (acc, meal) => {
      const mealNutrition = meal.foods.reduce(
        (mealAcc: any, mf: any) => {
          const multiplier = mf.servingSize * mf.quantity;
          return {
            calories: mealAcc.calories + (mf.food.caloriesPerServing * multiplier),
            protein: mealAcc.protein + (mf.food.proteinPerServing * multiplier),
            carbs: mealAcc.carbs + (mf.food.carbsPerServing * multiplier),
            fat: mealAcc.fat + (mf.food.fatPerServing * multiplier),
            fiber: mealAcc.fiber + ((mf.food.fiberPerServing || 0) * multiplier),
            sugar: mealAcc.sugar + ((mf.food.sugarPerServing || 0) * multiplier),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
      );

      return {
        calories: acc.calories + mealNutrition.calories,
        protein: acc.protein + mealNutrition.protein,
        carbs: acc.carbs + mealNutrition.carbs,
        fat: acc.fat + mealNutrition.fat,
        fiber: acc.fiber + mealNutrition.fiber,
        sugar: acc.sugar + mealNutrition.sugar,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
  );
}
