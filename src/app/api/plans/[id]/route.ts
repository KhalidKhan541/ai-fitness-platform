import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = await prisma.fitnessPlan.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, image: true, bio: true },
        },
        weeklySchedule: {
          include: {
            workout: {
              include: {
                exercises: {
                  include: { exercise: true },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        enrollments: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { enrolledAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const userEnrollment = await prisma.planEnrollment.findFirst({
      where: { planId: params.id, userId: user.id },
    });

    const isOwner = plan.userId === user.id;

    const stats = {
      totalEnrollments: plan._count.enrollments,
      activeEnrollments: plan.enrollments.filter((e) => e.status === 'active').length,
      averageProgress: plan.enrollments.length > 0
        ? Math.round(
            plan.enrollments.reduce((acc, e) => acc + e.progress, 0) /
              plan.enrollments.length
          )
        : 0,
    };

    const totalWorkoutsInPlan = plan.weeklySchedule.reduce((acc, day) => {
      if (day.workout) {
        return acc + 1;
      }
      return acc;
    }, 0);

    const totalExercises = plan.weeklySchedule.reduce((acc, day) => {
      if (day.workout?.exercises) {
        return acc + day.workout.exercises.length;
      }
      return acc;
    }, 0);

    const estimatedWeeklyMinutes = plan.weeklySchedule.reduce((acc, day) => {
      if (day.workout?.duration) {
        return acc + day.workout.duration;
      }
      return acc;
    }, 0);

    return NextResponse.json({
      plan,
      isOwner,
      isEnrolled: !!userEnrollment,
      enrollment: userEnrollment || null,
      stats: {
        ...stats,
        totalWorkoutsInPlan,
        totalExercises,
        estimatedWeeklyMinutes,
        durationWeeks: plan.duration,
        totalEstimatedWorkouts: totalWorkoutsInPlan * plan.duration,
      },
    });
  } catch (error) {
    console.error('GET /api/plans/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.fitnessPlan.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const body = await request.json();
    const { weeklySchedule, ...updateData } = body;

    const plan = await prisma.$transaction(async (tx) => {
      if (weeklySchedule) {
        await tx.planSchedule.deleteMany({ where: { planId: params.id } });
      }

      return tx.fitnessPlan.update({
        where: { id: params.id },
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
    console.error('PUT /api/plans/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.fitnessPlan.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.planSchedule.deleteMany({ where: { planId: params.id } });
      await tx.planEnrollment.deleteMany({ where: { planId: params.id } });
      await tx.fitnessPlan.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'Plan deleted' });
  } catch (error) {
    console.error('DELETE /api/plans/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete plan' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = await prisma.fitnessPlan.findUnique({
      where: { id: params.id },
      include: { _count: { select: { enrollments: true } } },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const existingEnrollment = await prisma.planEnrollment.findFirst({
      where: { planId: params.id, userId: user.id },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Already enrolled in this plan' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'enroll') {
      const enrollment = await prisma.planEnrollment.create({
        data: {
          planId: params.id,
          userId: user.id,
          status: 'active',
          progress: 0,
          startDate: new Date(),
        },
      });

      return NextResponse.json(
        { message: 'Successfully enrolled', enrollment },
        { status: 201 }
      );
    }

    if (action === 'unenroll') {
      if (!existingEnrollment) {
        return NextResponse.json(
          { error: 'Not enrolled in this plan' },
          { status: 404 }
        );
      }

      await prisma.planEnrollment.delete({
        where: { id: existingEnrollment.id },
      });

      return NextResponse.json({ message: 'Successfully unenrolled' });
    }

    if (action === 'updateProgress') {
      const { progress, currentWeek, notes } = body;

      const enrollment = await prisma.planEnrollment.update({
        where: { id: existingEnrollment!.id },
        data: {
          ...(progress !== undefined && { progress }),
          ...(currentWeek !== undefined && { currentWeek }),
          ...(notes !== undefined && { notes }),
          lastActivityAt: new Date(),
        },
      });

      return NextResponse.json({ enrollment });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/plans/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
