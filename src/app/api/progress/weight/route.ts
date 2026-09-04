import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const weightSchema = z.object({
  weight: z.number().min(20).max(500),
  unit: z.enum(['kg', 'lbs']).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().max(200).optional(),
  bodyFatPercentage: z.number().min(0).max(70).optional(),
  muscleMass: z.number().min(0).max(200).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

function convertToKg(weight: number, unit: string): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    let startDate = new Date();
    switch (range) {
      case 'week': startDate.setDate(startDate.getDate() - 7); break;
      case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3months': startDate.setMonth(startDate.getMonth() - 3); break;
      case '6months': startDate.setMonth(startDate.getMonth() - 6); break;
      case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
      case 'all': startDate = new Date('2000-01-01'); break;
      default: startDate.setMonth(startDate.getMonth() - 1);
    }

    const [entries, total] = await Promise.all([
      prisma.weightEntry.findMany({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.weightEntry.count({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
      }),
    ]);

    const allEntries = await prisma.weightEntry.findMany({
      where: {
        userId: user.id,
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'asc' },
      select: { weight: true, recordedAt: true, bodyFatPercentage: true },
    });

    const stats = {
      current: allEntries.length > 0 ? allEntries[allEntries.length - 1].weight : null,
      start: allEntries.length > 0 ? allEntries[0].weight : null,
      change: allEntries.length >= 2
        ? allEntries[allEntries.length - 1].weight - allEntries[0].weight
        : 0,
      average: allEntries.length > 0
        ? Math.round(allEntries.reduce((acc, e) => acc + e.weight, 0) / allEntries.length * 10) / 10
        : null,
      min: allEntries.length > 0 ? Math.min(...allEntries.map((e) => e.weight)) : null,
      max: allEntries.length > 0 ? Math.max(...allEntries.map((e) => e.weight)) : null,
      trend: allEntries.length >= 2
        ? allEntries[allEntries.length - 1].weight > allEntries[0].weight
          ? 'gaining'
          : allEntries[allEntries.length - 1].weight < allEntries[0].weight
            ? 'losing'
            : 'stable'
        : 'insufficient_data',
    };

    const bodyFatEntries = allEntries.filter((e) => e.bodyFatPercentage != null);
    const bodyFatStats = bodyFatEntries.length > 0
      ? {
          current: bodyFatEntries[bodyFatEntries.length - 1].bodyFatPercentage,
          change: bodyFatEntries.length >= 2
            ? bodyFatEntries[bodyFatEntries.length - 1].bodyFatPercentage! - bodyFatEntries[0].bodyFatPercentage!
            : 0,
        }
      : null;

    return NextResponse.json({
      entries,
      stats: { ...stats, bodyFat: bodyFatStats },
      chartData: allEntries.map((e) => ({
        date: e.recordedAt,
        weight: e.weight,
        bodyFat: e.bodyFatPercentage,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/progress/weight error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = weightSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { weight, unit, date, time, notes, bodyFatPercentage, muscleMass } = validation.data;
    const weightKg = convertToKg(weight, unit || 'kg');

    let recordedAt = new Date();
    if (date) {
      recordedAt = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        recordedAt.setHours(hours, minutes, 0, 0);
      }
    }

    const entry = await prisma.weightEntry.create({
      data: {
        userId: user.id,
        weight: weightKg,
        originalWeight: weight,
        originalUnit: unit || 'kg',
        recordedAt,
        notes: notes || '',
        bodyFatPercentage: bodyFatPercentage || null,
        muscleMass: muscleMass || null,
      },
    });

    const recentEntries = await prisma.weightEntry.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: 'desc' },
      take: 2,
      select: { weight: true },
    });

    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id,
        type: 'weight',
        status: 'active',
      },
    });

    for (const goal of goals) {
      const targetWeight = goal.targetValue;
      const progress = Math.min(100, Math.round(
        (1 - Math.abs(weightKg - targetWeight) / Math.abs(goal.startValue - targetWeight)) * 100
      ));

      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentValue: weightKg,
          progress: Math.max(0, progress),
          status: progress >= 100 ? 'completed' : 'active',
        },
      });
    }

    return NextResponse.json(
      {
        entry,
        trend: recentEntries.length >= 2
          ? recentEntries[0].weight - recentEntries[1].weight
          : 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/progress/weight error:', error);
    return NextResponse.json(
      { error: 'Failed to log weight' },
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

    const entry = await prisma.weightEntry.findFirst({
      where: { id, userId: user.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.weightEntry.delete({ where: { id } });

    return NextResponse.json({ message: 'Weight entry deleted' });
  } catch (error) {
    console.error('DELETE /api/progress/weight error:', error);
    return NextResponse.json(
      { error: 'Failed to delete weight entry' },
      { status: 500 }
    );
  }
}
