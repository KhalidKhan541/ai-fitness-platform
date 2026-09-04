import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const measurementSchema = z.object({
  date: z.string().optional(),
  chest: z.number().min(0).max(200).optional(),
  waist: z.number().min(0).max(200).optional(),
  hips: z.number().min(0).max(200).optional(),
  bicepLeft: z.number().min(0).max(100).optional(),
  bicepRight: z.number().min(0).max(100).optional(),
  forearmLeft: z.number().min(0).max(60).optional(),
  forearmRight: z.number().min(0).max(60).optional(),
  thighLeft: z.number().min(0).max(120).optional(),
  thighRight: z.number().min(0).max(120).optional(),
  calfLeft: z.number().min(0).max(80).optional(),
  calfRight: z.number().min(0).max(80).optional(),
  neck: z.number().min(0).max(80).optional(),
  shoulder: z.number().min(0).max(200).optional(),
  unit: z.enum(['cm', 'inches']).optional(),
  notes: z.string().max(200).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

function convertToCm(value: number, unit: string): number {
  return unit === 'inches' ? value * 2.54 : value;
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
      prisma.bodyMeasurement.findMany({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bodyMeasurement.count({
        where: {
          userId: user.id,
          recordedAt: { gte: startDate },
        },
      }),
    ]);

    const allEntries = await prisma.bodyMeasurement.findMany({
      where: {
        userId: user.id,
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'asc' },
    });

    const trends: Record<string, any> = {};
    if (allEntries.length >= 2) {
      const fields = ['chest', 'waist', 'hips', 'bicepLeft', 'thighLeft', 'neck', 'shoulder'];
      fields.forEach((field) => {
        const firstVal = (allEntries[0] as any)[field];
        const lastVal = (allEntries[allEntries.length - 1] as any)[field];
        if (firstVal != null && lastVal != null) {
          trends[field] = {
            start: firstVal,
            current: lastVal,
            change: Math.round((lastVal - firstVal) * 10) / 10,
            trend: lastVal > firstVal ? 'increasing' : lastVal < firstVal ? 'decreasing' : 'stable',
          };
        }
      });
    }

    const waistToHipRatio = allEntries.length > 0
      ? allEntries.map((e) => ({
          date: e.recordedAt,
          ratio: e.waist && e.hips ? Math.round((e.waist / e.hips) * 100) / 100 : null,
        })).filter((e) => e.ratio !== null)
      : [];

    return NextResponse.json({
      entries,
      trends,
      waistToHipRatio,
      latestEntry: entries[0] || null,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/progress/measurements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
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
    const validation = measurementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { date, unit, notes, ...measurements } = validation.data;

    let recordedAt = new Date();
    if (date) recordedAt = new Date(date);

    const convert = (val?: number) =>
      val != null ? convertToCm(val, unit || 'cm') : null;

    const entry = await prisma.bodyMeasurement.create({
      data: {
        userId: user.id,
        chest: convert(measurements.chest),
        waist: convert(measurements.waist),
        hips: convert(measurements.hips),
        bicepLeft: convert(measurements.bicepLeft),
        bicepRight: convert(measurements.bicepRight),
        forearmLeft: convert(measurements.forearmLeft),
        forearmRight: convert(measurements.forearmRight),
        thighLeft: convert(measurements.thighLeft),
        thighRight: convert(measurements.thighRight),
        calfLeft: convert(measurements.calfLeft),
        calfRight: convert(measurements.calfRight),
        neck: convert(measurements.neck),
        shoulder: convert(measurements.shoulder),
        unit: unit || 'cm',
        recordedAt,
        notes: notes || '',
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/progress/measurements error:', error);
    return NextResponse.json(
      { error: 'Failed to log measurements' },
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

    const entry = await prisma.bodyMeasurement.findFirst({
      where: { id, userId: user.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.bodyMeasurement.delete({ where: { id } });

    return NextResponse.json({ message: 'Measurement deleted' });
  } catch (error) {
    console.error('DELETE /api/progress/measurements error:', error);
    return NextResponse.json(
      { error: 'Failed to delete measurement' },
      { status: 500 }
    );
  }
}
