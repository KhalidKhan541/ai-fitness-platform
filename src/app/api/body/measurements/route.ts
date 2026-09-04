import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bodyMeasurementSchema = z.object({
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
  bodyFatPercentage: z.number().min(0).max(70).optional(),
  muscleMass: z.number().min(0).max(200).optional(),
  visceralFat: z.number().min(0).max(50).optional(),
  boneDensity: z.number().min(0).max(3).optional(),
  metabolicAge: z.number().min(10).max(100).optional(),
  restingHeartRate: z.number().min(30).max(200).optional(),
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(40).max(150).optional(),
  unit: z.enum(['cm', 'inches']).optional(),
  notes: z.string().max(300).optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

function convertToCm(value: number, unit: string): number {
  return unit === 'inches' ? value * 2.54 : value;
}

function calculateBodyComposition(data: any) {
  const results: any = {};

  if (data.chest && data.waist && data.hips) {
    results.waistToHipRatio = Math.round((data.waist / data.hips) * 100) / 100;
    results.waistToHeightRatio = Math.round((data.waist / (data.chest * 2)) * 100) / 100;
  }

  if (data.waist && data.neck && data.height) {
    results.navyBodyFat = Math.round(
      (495 / (1.0324 - 0.19077 * Math.log10(data.waist - data.neck) + 0.15456 * Math.log10(data.height))) - 450
    );
  }

  if (data.bodyFatPercentage) {
    const bf = data.bodyFatPercentage;
    if (bf < 6) results.bodyFatCategory = 'essential';
    else if (bf < 14) results.bodyFatCategory = 'athletic';
    else if (bf < 18) results.bodyFatCategory = 'fitness';
    else if (bf < 25) results.bodyFatCategory = 'average';
    else results.bodyFatCategory = 'above_average';
  }

  if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
    const sys = data.bloodPressureSystolic;
    const dia = data.bloodPressureDiastolic;
    if (sys < 120 && dia < 80) results.bloodPressureCategory = 'normal';
    else if (sys < 130 && dia < 80) results.bloodPressureCategory = 'elevated';
    else if (sys < 140 || dia < 90) results.bloodPressureCategory = 'high_stage_1';
    else results.bloodPressureCategory = 'high_stage_2';
  }

  if (data.restingHeartRate) {
    const rhr = data.restingHeartRate;
    if (rhr < 60) results.heartRateCategory = 'excellent';
    else if (rhr < 70) results.heartRateCategory = 'good';
    else if (rhr < 80) results.heartRateCategory = 'average';
    else if (rhr < 100) results.heartRateCategory = 'above_average';
    else results.heartRateCategory = 'poor';
  }

  return results;
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

    const latestEntry = entries[0] || null;
    const composition = latestEntry ? calculateBodyComposition(latestEntry) : {};

    const trends: Record<string, any> = {};
    if (allEntries.length >= 2) {
      const fields = ['chest', 'waist', 'hips', 'bicepLeft', 'thighLeft', 'neck', 'bodyFatPercentage', 'muscleMass'];
      fields.forEach((field) => {
        const values = allEntries.filter((e) => (e as any)[field] != null);
        if (values.length >= 2) {
          const first = (values[0] as any)[field];
          const last = (values[values.length - 1] as any)[field];
          trends[field] = {
            start: first,
            current: last,
            change: Math.round((last - first) * 10) / 10,
            changePercent: Math.round(((last - first) / first) * 100 * 10) / 10,
            trend: last > first ? 'increasing' : last < first ? 'decreasing' : 'stable',
          };
        }
      });
    }

    return NextResponse.json({
      entries,
      latestEntry,
      composition,
      trends,
      chartData: allEntries.map((e) => ({
        date: e.recordedAt,
        chest: e.chest,
        waist: e.waist,
        hips: e.hips,
        bodyFat: e.bodyFatPercentage,
        muscleMass: e.muscleMass,
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
    console.error('GET /api/body/measurements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch body measurements' },
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
    const validation = bodyMeasurementSchema.safeParse(body);
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
        bodyFatPercentage: measurements.bodyFatPercentage || null,
        muscleMass: measurements.muscleMass || null,
        visceralFat: measurements.visceralFat || null,
        boneDensity: measurements.boneDensity || null,
        metabolicAge: measurements.metabolicAge || null,
        restingHeartRate: measurements.restingHeartRate || null,
        bloodPressureSystolic: measurements.bloodPressureSystolic || null,
        bloodPressureDiastolic: measurements.bloodPressureDiastolic || null,
        unit: unit || 'cm',
        recordedAt,
        notes: notes || '',
      },
    });

    const composition = calculateBodyComposition(entry);

    return NextResponse.json(
      { entry, composition },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/body/measurements error:', error);
    return NextResponse.json(
      { error: 'Failed to log body measurements' },
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

    return NextResponse.json({ message: 'Body measurement deleted' });
  } catch (error) {
    console.error('DELETE /api/body/measurements error:', error);
    return NextResponse.json(
      { error: 'Failed to delete body measurement' },
      { status: 500 }
    );
  }
}
