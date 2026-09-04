import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const sleepSchema = z.object({
  bedtime: z.string(),
  wakeTime: z.string(),
  quality: z.number().min(1).max(5),
  interruptions: z.number().min(0).max(20).optional(),
  dreams: z.boolean().optional(),
  notes: z.string().max(300).optional(),
  sleepEnvironment: z.enum(['quiet', 'noisy', 'cold', 'warm', 'comfortable']).optional(),
  screenTimeBeforeBed: z.number().min(0).max(480).optional(),
  caffeineAfter2PM: z.boolean().optional(),
  alcoholConsumption: z.boolean().optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

function calculateSleepDuration(bedtime: string, wakeTime: string): number {
  const bed = new Date(bedtime);
  const wake = new Date(wakeTime);

  if (wake < bed) {
    wake.setDate(wake.getDate() + 1);
  }

  return Math.round((wake.getTime() - bed.getTime()) / (1000 * 60));
}

function categorizeSleepQuality(duration: number, quality: number): string {
  const hours = duration / 60;
  if (hours >= 7 && hours <= 9 && quality >= 4) return 'excellent';
  if (hours >= 6 && hours <= 10 && quality >= 3) return 'good';
  if (hours >= 5 && quality >= 2) return 'fair';
  return 'poor';
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    let startDate = new Date();
    switch (range) {
      case 'week': startDate.setDate(startDate.getDate() - 7); break;
      case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3months': startDate.setMonth(startDate.getMonth() - 3); break;
      default: startDate.setDate(startDate.getDate() - 7);
    }

    const [entries, total] = await Promise.all([
      prisma.sleepLog.findMany({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sleepLog.count({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
      }),
    ]);

    const allEntries = await prisma.sleepLog.findMany({
      where: {
        userId: user.id,
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const stats = {
      averageDuration: allEntries.length > 0
        ? Math.round(allEntries.reduce((acc, e) => acc + e.durationMinutes, 0) / allEntries.length)
        : 0,
      averageQuality: allEntries.length > 0
        ? (allEntries.reduce((acc, e) => acc + e.quality, 0) / allEntries.length).toFixed(1)
        : 0,
      totalNightsTracked: allEntries.length,
      bestNight: allEntries.length > 0
        ? allEntries.reduce((best, e) =>
            e.quality > best.quality ? e : best
          )
        : null,
      worstNight: allEntries.length > 0
        ? allEntries.reduce((worst, e) =>
            e.quality < worst.quality ? e : worst
          )
        : null,
      qualityDistribution: {
        excellent: allEntries.filter((e) => e.quality === 5).length,
        good: allEntries.filter((e) => e.quality === 4).length,
        fair: allEntries.filter((e) => e.quality === 3).length,
        poor: allEntries.filter((e) => e.quality === 2).length,
        terrible: allEntries.filter((e) => e.quality === 1).length,
      },
      averageBedtime: calculateAverageTime(allEntries.map((e) => e.bedtime)),
      averageWakeTime: calculateAverageTime(allEntries.map((e) => e.wakeTime)),
      consistency: calculateConsistency(allEntries),
    };

    const weeklyTrend = [];
    const weekMap = new Map<string, { durations: number[]; qualities: number[] }>();

    allEntries.forEach((entry) => {
      const weekStart = new Date(entry.recordedAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set( weekKey, { durations: [], qualities: [] });
      }
      const week = weekMap.get(weekKey)!;
      week.durations.push(entry.durationMinutes);
      week.qualities.push(entry.quality);
    });

    weekMap.forEach((value, key) => {
      weeklyTrend.push({
        week: key,
        avgDuration: Math.round(value.durations.reduce((a, b) => a + b, 0) / value.durations.length),
        avgQuality: (value.qualities.reduce((a, b) => a + b, 0) / value.qualities.length).toFixed(1),
        nightsTracked: value.durations.length,
      });
    });

    return NextResponse.json({
      entries,
      stats,
      weeklyTrend: weeklyTrend.sort((a, b) => a.week.localeCompare(b.week)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/sleep error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sleep data' },
      { status: 500 }
    );
  }
}

function calculateAverageTime(times: string[]): string {
  if (times.length === 0) return '00:00';

  let totalMinutes = 0;
  let count = 0;

  times.forEach((time) => {
    const date = new Date(time);
    let hours = date.getHours();
    const minutes = date.getMinutes();

    if (hours < 12) hours += 24;

    totalMinutes += hours * 60 + minutes;
    count++;
  });

  const avgMinutes = Math.round(totalMinutes / count);
  const h = Math.floor(avgMinutes / 60) % 24;
  const m = avgMinutes % 60;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function calculateConsistency(entries: any[]): number {
  if (entries.length < 3) return 0;

  const durations = entries.map((e) => e.durationMinutes);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);

  const consistency = Math.max(0, 100 - (stdDev / avg) * 100);
  return Math.round(consistency);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = sleepSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { bedtime, wakeTime, quality, interruptions, dreams, notes, sleepEnvironment, screenTimeBeforeBed, caffeineAfter2PM, alcoholConsumption } = validation.data;

    const durationMinutes = calculateSleepDuration(bedtime, wakeTime);
    const category = categorizeSleepQuality(durationMinutes, quality);

    const entry = await prisma.sleepLog.create({
      data: {
        userId: user.id,
        bedtime: new Date(bedtime),
        wakeTime: new Date(wakeTime),
        durationMinutes,
        quality,
        category,
        interruptions: interruptions || 0,
        dreams: dreams || false,
        notes: notes || '',
        sleepEnvironment: sleepEnvironment || null,
        screenTimeBeforeBed: screenTimeBeforeBed || null,
        caffeineAfter2PM: caffeineAfter2PM || false,
        alcoholConsumption: alcoholConsumption || false,
        recordedAt: new Date(bedtime),
      },
    });

    const recentEntries = await prisma.sleepLog.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: 'desc' },
      take: 7,
    });

    const avgDuration = recentEntries.reduce((acc, e) => acc + e.durationMinutes, 0) / recentEntries.length;
    const avgQuality = recentEntries.reduce((acc, e) => acc + e.quality, 0) / recentEntries.length;

    let recommendation = '';
    if (durationMinutes < 360) {
      recommendation = 'You slept less than 6 hours. Try to get 7-9 hours for optimal recovery.';
    } else if (durationMinutes > 540) {
      recommendation = 'You slept more than 9 hours. While rest is important, oversleeping can affect energy levels.';
    } else if (quality < 3) {
      recommendation = 'Your sleep quality was low. Consider reducing screen time before bed and creating a consistent bedtime routine.';
    } else {
      recommendation = 'Great sleep! Keep maintaining your consistent sleep schedule.';
    }

    return NextResponse.json(
      {
        entry,
        stats: {
          duration: durationMinutes,
          durationFormatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
          category,
          recommendation,
        },
        weeklyAverage: {
          duration: Math.round(avgDuration),
          quality: (avgQuality).toFixed(1),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/sleep error:', error);
    return NextResponse.json(
      { error: 'Failed to log sleep' },
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const entry = await prisma.sleepLog.findFirst({
      where: { id, userId: user.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.sleepLog.delete({ where: { id } });

    return NextResponse.json({ message: 'Sleep entry deleted' });
  } catch (error) {
    console.error('DELETE /api/sleep error:', error);
    return NextResponse.json(
      { error: 'Failed to delete sleep entry' },
      { status: 500 }
    );
  }
}
