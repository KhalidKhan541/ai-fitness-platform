import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const workoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['strength', 'cardio', 'flexibility', 'hiit', 'sports', 'other']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().min(1).max(480),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    sets: z.number().min(1).max(20).optional(),
    reps: z.number().min(1).max(100).optional(),
    weight: z.number().min(0).max(1000).optional(),
    duration: z.number().min(0).max(7200).optional(),
    distance: z.number().min(0).max(100).optional(),
    restSeconds: z.number().min(0).max(600).optional(),
    order: z.number().min(0),
    notes: z.string().max(200).optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
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
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');
    const isTemplate = searchParams.get('isTemplate');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = { userId: user.id };

    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (isTemplate !== null && isTemplate !== undefined) {
      where.isTemplate = isTemplate === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [workouts, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
          logs: {
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workout.count({ where }),
    ]);

    const workoutsWithStats = workouts.map((workout) => {
      const totalSets = workout.exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0);
      const totalVolume = workout.logs[0]?.totalVolume || 0;
      return {
        ...workout,
        stats: {
          totalExercises: workout.exercises.length,
          totalSets,
          totalVolume,
          lastCompleted: workout.logs[0]?.completedAt || null,
          completionCount: workout._count?.logs || 0,
        },
      };
    });

    return NextResponse.json({
      workouts: workoutsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/workouts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = workoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { exercises, tags, ...workoutData } = validation.data;

    const workout = await prisma.workout.create({
      data: {
        ...workoutData,
        userId: user.id,
        isTemplate: workoutData.isTemplate || false,
        exercises: exercises
          ? {
              create: exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                weight: ex.weight || 0,
                duration: ex.duration || 0,
                distance: ex.distance || 0,
                restSeconds: ex.restSeconds || 60,
                order: ex.order,
                notes: ex.notes || '',
              })),
            }
          : undefined,
        tags: tags
          ? {
              create: tags.map((tag) => ({
                name: tag.toLowerCase().trim(),
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
        tags: true,
      },
    });

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/workouts error:', error);

    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'One or more exercise IDs are invalid' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create workout' },
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
    const { id, exercises, tags, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }

    const existing = await prisma.workout.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const workout = await prisma.$transaction(async (tx) => {
      if (exercises) {
        await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
      }
      if (tags) {
        await tx.workoutTag.deleteMany({ where: { workoutId: id } });
      }

      return tx.workout.update({
        where: { id },
        data: {
          ...updateData,
          exercises: exercises
            ? {
                create: exercises.map((ex: any) => ({
                  exerciseId: ex.exerciseId,
                  sets: ex.sets || 3,
                  reps: ex.reps || 10,
                  weight: ex.weight || 0,
                  duration: ex.duration || 0,
                  distance: ex.distance || 0,
                  restSeconds: ex.restSeconds || 60,
                  order: ex.order,
                  notes: ex.notes || '',
                })),
              }
            : undefined,
          tags: tags
            ? {
                create: tags.map((tag: string) => ({
                  name: tag.toLowerCase().trim(),
                })),
              }
            : undefined,
        },
        include: {
          exercises: { include: { exercise: true }, orderBy: { order: 'asc' } },
          tags: true,
        },
      });
    });

    return NextResponse.json({ workout });
  } catch (error) {
    console.error('PUT /api/workouts error:', error);
    return NextResponse.json(
      { error: 'Failed to update workout' },
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
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }

    const existing = await prisma.workout.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
      await tx.workoutTag.deleteMany({ where: { workoutId: id } });
      await tx.workoutLog.deleteMany({ where: { workoutId: id } });
      await tx.workout.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Workout deleted' });
  } catch (error) {
    console.error('DELETE /api/workouts error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout' },
      { status: 500 }
    );
  }
}
