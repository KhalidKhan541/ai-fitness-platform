import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const waterLogSchema = z.object({
  amount: z.number().min(1).max(5000),
  unit: z.enum(['ml', 'oz', 'cups', 'liters']),
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().max(100).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

function convertToMl(amount: number, unit: string): number {
  switch (unit) {
    case 'ml': return amount;
    case 'oz': return amount * 29.5735;
    case 'cups': return amount * 236.588;
    case 'liters': return amount * 1000;
    default: return amount;
  }
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
      select: { dailyWaterGoal: true, weightUnit: true },
    });

    const dailyGoal = preferences?.dailyWaterGoal || 2500;

    if (range === 'day') {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const logs = await prisma.waterLog.findMany({
        where: {
          userId: user.id,
          loggedAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { loggedAt: 'desc' },
      });

      const totalMl = logs.reduce((acc, log) => acc + log.amountMl, 0);

      return NextResponse.json({
        date,
        logs,
        total: totalMl,
        goal: dailyGoal,
        progress: Math.round((totalMl / dailyGoal) * 100),
        remaining: Math.max(0, dailyGoal - totalMl),
        unit: preferences?.weightUnit || 'metric',
      });
    }

    if (range === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const dailyData = await prisma.$queryRaw`
        SELECT
          DATE("loggedAt") as "date",
          SUM("amountMl") as "totalMl",
          COUNT(*) as "logCount"
        FROM "WaterLog"
        WHERE "userId" = ${user.id}
          AND "loggedAt" >= ${weekAgo}
        GROUP BY DATE("loggedAt")
        ORDER BY "date" ASC
      `;

      return NextResponse.json({
        range: 'week',
        dailyData,
        goal: dailyGoal,
        averageDaily: dailyData.length > 0
          ? Math.round(dailyData.reduce((acc: number, d: any) => acc + Number(d.totalMl), 0) / dailyData.length)
          : 0,
      });
    }

    if (range === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const dailyData = await prisma.$queryRaw`
        SELECT
          DATE("loggedAt") as "date",
          SUM("amountMl") as "totalMl",
          COUNT(*) as "logCount"
        FROM "WaterLog"
        WHERE "userId" = ${user.id}
          AND "loggedAt" >= ${monthAgo}
        GROUP BY DATE("loggedAt")
        ORDER BY "date" ASC
      `;

      return NextResponse.json({
        range: 'month',
        dailyData,
        goal: dailyGoal,
        averageDaily: dailyData.length > 0
          ? Math.round(dailyData.reduce((acc: number, d: any) => acc + Number(d.totalMl), 0) / dailyData.length)
          : 0,
        streak: calculateStreak(dailyData, dailyGoal),
      });
    }

    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/nutrition/water error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch water data' },
      { status: 500 }
    );
  }
}

function calculateStreak(dailyData: any[], goal: number): number {
  let streak = 0;
  const sortedData = [...dailyData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const day of sortedData) {
    if (Number(day.totalMl) >= goal) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = waterLogSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, unit, date, time, notes } = validation.data;
    const amountMl = convertToMl(amount, unit);

    let loggedAt = new Date();
    if (date) {
      loggedAt = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        loggedAt.setHours(hours, minutes, 0, 0);
      } else {
        loggedAt.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);
      }
    }

    const log = await prisma.waterLog.create({
      data: {
        userId: user.id,
        amountMl,
        originalAmount: amount,
        originalUnit: unit,
        loggedAt,
        notes: notes || '',
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayTotal = await prisma.waterLog.aggregate({
      where: {
        userId: user.id,
        loggedAt: { gte: today, lte: todayEnd },
      },
      _sum: { amountMl: true },
    });

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
      select: { dailyWaterGoal: true },
    });

    const dailyGoal = preferences?.dailyWaterGoal || 2500;
    const totalToday = todayTotal._sum.amountMl || 0;

    return NextResponse.json(
      {
        log,
        todayTotal: totalToday,
        goal: dailyGoal,
        progress: Math.round((totalToday / dailyGoal) * 100),
        remaining: Math.max(0, dailyGoal - totalToday),
        goalReached: totalToday >= dailyGoal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/nutrition/water error:', error);
    return NextResponse.json(
      { error: 'Failed to log water intake' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');

    if (!logId) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
    }

    const log = await prisma.waterLog.findFirst({
      where: { id: logId, userId: user.id },
    });

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    await prisma.waterLog.delete({ where: { id: logId } });

    return NextResponse.json({ message: 'Water log deleted' });
  } catch (error) {
    console.error('DELETE /api/nutrition/water error:', error);
    return NextResponse.json(
      { error: 'Failed to delete water log' },
      { status: 500 }
    );
  }
}
