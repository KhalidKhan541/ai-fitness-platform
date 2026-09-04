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
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const category = searchParams.get('category');
    const muscleGroup = searchParams.get('muscleGroup');
    const equipment = searchParams.get('equipment');
    const difficulty = searchParams.get('difficulty');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const where: any = { isActive: true };

    if (category) {
      where.category = { name: { contains: category, mode: 'insensitive' } };
    }
    if (muscleGroup) {
      where.muscleGroups = {
        some: { name: { contains: muscleGroup, mode: 'insensitive' } },
      };
    }
    if (equipment) {
      where.equipment = { name: { contains: equipment, mode: 'insensitive' } };
    }
    if (difficulty) where.difficulty = difficulty;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { instructions: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        include: {
          category: true,
          muscleGroups: true,
          equipment: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exercise.count({ where }),
    ]);

    const categories = await prisma.exerciseCategory.findMany({
      include: { _count: { select: { exercises: true } } },
      orderBy: { name: 'asc' },
    });

    const muscleGroups = await prisma.muscleGroup.findMany({
      include: { _count: { select: { exercises: true } } },
      orderBy: { name: 'asc' },
    });

    const equipments = await prisma.equipment.findMany({
      include: { _count: { select: { exercises: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      exercises,
      filters: {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          count: c._count.exercises,
        })),
        muscleGroups: muscleGroups.map((mg) => ({
          id: mg.id,
          name: mg.name,
          count: mg._count.exercises,
        })),
        equipments: equipments.map((e) => ({
          id: e.id,
          name: e.name,
          count: e._count.exercises,
        })),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/exercises error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
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
    const { name, description, instructions, type, difficulty, categoryId, muscleGroupIds, equipmentId, imageUrl, videoUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Exercise name required' }, { status: 400 });
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: name.trim(),
        description: description || '',
        instructions: instructions || '',
        type: type || 'strength',
        difficulty: difficulty || 'intermediate',
        categoryId: categoryId || null,
        equipmentId: equipmentId || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        isCustom: true,
        createdByUserId: user.id,
        isActive: true,
        muscleGroups: muscleGroupIds?.length
          ? {
              connect: muscleGroupIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        category: true,
        muscleGroups: true,
        equipment: true,
      },
    });

    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    console.error('POST /api/exercises error:', error);
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
