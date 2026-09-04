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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const type = searchParams.get('type');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');

    const where: any = {
      isTemplate: true,
      OR: [
        { userId: user.id },
        { isPublic: true },
      ],
    };

    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
          tags: true,
          user: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { logs: true, copies: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workout.count({ where }),
    ]);

    const templateCategories = await prisma.workout.groupBy({
      by: ['type'],
      where: { isTemplate: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return NextResponse.json({
      templates,
      categories: templateCategories.map((cat) => ({
        type: cat.type,
        count: cat._count.id,
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
    console.error('GET /api/workouts/templates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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
    const { templateId, name, description } = body;

    const template = await prisma.workout.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId: user.id },
          { isPublic: true },
        ],
        isTemplate: true,
      },
      include: {
        exercises: true,
        tags: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const workout = await prisma.$transaction(async (tx) => {
      const newWorkout = await tx.workout.create({
        data: {
          name: name || `${template.name} (Copy)`,
          description: description || template.description,
          type: template.type,
          difficulty: template.difficulty,
          duration: template.duration,
          userId: user.id,
          isTemplate: false,
          isPublic: false,
          copiedFromId: template.id,
          exercises: {
            create: template.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              duration: ex.duration,
              distance: ex.distance,
              restSeconds: ex.restSeconds,
              order: ex.order,
              notes: ex.notes,
            })),
          },
        },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (template.tags.length > 0) {
        await tx.workoutTag.createMany({
          data: template.tags.map((tag) => ({
            workoutId: newWorkout.id,
            name: tag.name,
          })),
        });
      }

      return newWorkout;
    });

    await prisma.workout.update({
      where: { id: template.id },
      data: { copies: { increment: 1 } },
    });

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error) {
    console.error('POST /api/workouts/templates error:', error);
    return NextResponse.json(
      { error: 'Failed to create workout from template' },
      { status: 500 }
    );
  }
}
