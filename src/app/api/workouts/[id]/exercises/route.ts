import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const exerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().min(1).max(20).optional(),
  reps: z.number().min(1).max(100).optional(),
  weight: z.number().min(0).max(1000).optional(),
  duration: z.number().min(0).max(7200).optional(),
  distance: z.number().min(0).max(100).optional(),
  restSeconds: z.number().min(0).max(600).optional(),
  order: z.number().min(0),
  notes: z.string().max(200).optional(),
});

const bulkSchema = z.object({
  exercises: z.array(exerciseSchema).min(1),
});

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

    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                category: true,
                muscleGroups: true,
                equipment: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    return NextResponse.json({
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: workout.exercises.map((we) => ({
        id: we.id,
        exerciseId: we.exerciseId,
        name: we.exercise.name,
        category: we.exercise.category?.name || null,
        muscleGroups: we.exercise.muscleGroups.map((mg) => mg.name),
        equipment: we.exercise.equipment?.name || null,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight,
        duration: we.duration,
        distance: we.distance,
        restSeconds: we.restSeconds,
        order: we.order,
        notes: we.notes,
        image: we.exercise.imageUrl,
        instructions: we.exercise.instructions,
      })),
    });
  } catch (error) {
    console.error('GET /api/workouts/[id]/exercises error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
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

    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = bulkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const exerciseIds = validation.data.exercises.map((e) => e.exerciseId);
    const existingExercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true },
    });

    if (existingExercises.length !== exerciseIds.length) {
      const missingIds = exerciseIds.filter(
        (id) => !existingExercises.find((e) => e.id === id)
      );
      return NextResponse.json(
        { error: `Invalid exercise IDs: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.workoutExercise.aggregate({
      where: { workoutId: params.id },
      _max: { order: true },
    });
    const startOrder = (maxOrder._max.order || -1) + 1;

    const createdExercises = await prisma.$transaction(
      validation.data.exercises.map((ex, index) =>
        prisma.workoutExercise.create({
          data: {
            workoutId: params.id,
            exerciseId: ex.exerciseId,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            duration: ex.duration || 0,
            distance: ex.distance || 0,
            restSeconds: ex.restSeconds || 60,
            order: startOrder + index,
            notes: ex.notes || '',
          },
          include: {
            exercise: true,
          },
        })
      )
    );

    return NextResponse.json(
      { exercises: createdExercises },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/workouts/[id]/exercises error:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Exercise already exists in this workout' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add exercises' },
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

    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const body = await request.json();
    const { exerciseUpdates } = body;

    if (!Array.isArray(exerciseUpdates)) {
      return NextResponse.json(
        { error: 'exerciseUpdates must be an array' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(
      exerciseUpdates.map((update: any) =>
        prisma.workoutExercise.update({
          where: {
            id: update.id,
            workoutId: params.id,
          },
          data: {
            sets: update.sets,
            reps: update.reps,
            weight: update.weight,
            duration: update.duration,
            distance: update.distance,
            restSeconds: update.restSeconds,
            order: update.order,
            notes: update.notes,
          },
          include: { exercise: true },
        })
      )
    );

    return NextResponse.json({ exercises: updated });
  } catch (error) {
    console.error('PUT /api/workouts/[id]/exercises error:', error);
    return NextResponse.json(
      { error: 'Failed to update exercises' },
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

    const workout = await prisma.workout.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'exerciseId query parameter required' },
        { status: 400 }
      );
    }

    const deleted = await prisma.workoutExercise.deleteMany({
      where: {
        workoutId: params.id,
        exerciseId: exerciseId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Exercise not found in workout' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Exercise removed from workout' });
  } catch (error) {
    console.error('DELETE /api/workouts/[id]/exercises error:', error);
    return NextResponse.json(
      { error: 'Failed to remove exercise' },
      { status: 500 }
    );
  }
}
