import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const planSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['workout', 'nutrition', 'hybrid']),
  duration: z.number().min(1).max(52),
  durationUnit: z.enum(['weeks', 'months']).optional(),
  goals: z.array(z.string()).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  isPublic: z.boolean().optional(),
  weeklySchedule: z.array(z.object({
    day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    workoutId: z.string().optional(),
    restDay: z.boolean().optional(),
    notes: z.string().max(200).optional(),
  })).optional(),
  nutritionPlan: z.object({
    dailyCalories: z.number().optional(),
    dailyProtein: z.number().optional(),
    dailyCarbs: z.number().optional(),
    dailyFat: z.number().optional(),
    mealsPerDay: z.number().optional(),
  }).optional(),
});

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    const where: any = {
      OR: [
        { userId: user.id },
        { isPublic: true },
      ],
    };

    if (type) where.type = type;
    if (active === 'true') where.status = 'active';
    if (active === 'false') where.status = { in: ['completed', 'paused', 'archived'] };

    const [plans, total] = await Promise.all([
      prisma.fitnessPlan.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
          weeklySchedule: {
            include: {
              workout: {
                select: { id: true, name: true, type: true, duration: true },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fitnessPlan.count({ where }),
    ]);

    const plansWithUserStatus = plans.map((plan) => ({
      ...plan,
      isOwnPlan: plan.userId === user.id,
      isEnrolled: false,
    }));

    const enrolledPlanIds = await prisma.planEnrollment.findMany({
      where: {
        userId: user.id,
        planId: { in: plans.map((p) => p.id) },
      },
      select: { planId: true, status: true, progress: true },
    });

    const enrolledMap = new Map(enrolledPlanIds.map((e) => [e.planId, e]));

    const plansWithStatus = plansWithUserStatus.map((plan) => ({
      ...plan,
      isEnrolled: enrolledMap.has(plan.id),
      enrollmentStatus: enrolledMap.get(plan.id)?.status || null,
      enrollmentProgress: enrolledMap.get(plan.id)?.progress || 0,
    }));

    return NextResponse.json({
      plans: plansWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/plans error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
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
    const validation = planSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { weeklySchedule, nutritionPlan, ...planData } = validation.data;

    const plan = await prisma.fitnessPlan.create({
      data: {
        ...planData,
        userId: user.id,
        status: 'draft',
        isPublic: planData.isPublic ?? false,
        durationUnit: planData.durationUnit || 'weeks',
        goals: planData.goals || [],
        weeklySchedule: weeklySchedule
          ? {
              create: weeklySchedule.map((day, index) => ({
                day: day.day,
                order: index,
                workoutId: day.workoutId || null,
                restDay: day.restDay || false,
                notes: day.notes || '',
              })),
            }
          : undefined,
        nutritionPlan: nutritionPlan || undefined,
      },
      include: {
        weeklySchedule: {
          include: {
            workout: { select: { id: true, name: true, type: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('POST /api/plans error:', error);
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, weeklySchedule, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const existing = await prisma.fitnessPlan.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan = await prisma.$transaction(async (tx) => {
      if (weeklySchedule) {
        await tx.planSchedule.deleteMany({ where: { planId: id } });
      }

      return tx.fitnessPlan.update({
        where: { id },
        data: {
          ...updateData,
          ...(weeklySchedule && {
            weeklySchedule: {
              create: weeklySchedule.map((day: any, index: number) => ({
                day: day.day,
                order: index,
                workoutId: day.workoutId || null,
                restDay: day.restDay || false,
                notes: day.notes || '',
              })),
            },
          }),
        },
        include: {
          weeklySchedule: {
            include: { workout: true },
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('PUT /api/plans error:', error);
    return NextResponse.json(
      { error: 'Failed to update plan' },
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
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const existing = await prisma.fitnessPlan.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.planSchedule.deleteMany({ where: { planId: id } });
      await tx.planEnrollment.deleteMany({ where: { planId: id } });
      await tx.fitnessPlan.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Plan deleted' });
  } catch (error) {
    console.error('DELETE /api/plans error:', error);
    return NextResponse.json(
      { error: 'Failed to delete plan' },
      { status: 500 }
    );
  }
}
