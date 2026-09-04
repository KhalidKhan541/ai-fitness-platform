import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const challengeSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000),
  type: z.enum(['workout_count', 'total_volume', 'streak', 'custom']),
  goalValue: z.number().min(1),
  unit: z.string().max(20),
  startDate: z.string(),
  endDate: z.string(),
  isPublic: z.boolean().optional(),
  maxParticipants: z.number().min(2).max(1000).optional(),
  rules: z.string().max(2000).optional(),
  prizes: z.array(z.object({
    place: z.number().min(1),
    title: z.string(),
    description: z.string().optional(),
  })).optional(),
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
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const joined = searchParams.get('joined');

    const where: any = {};

    if (status === 'active') {
      where.startDate = { lte: new Date() };
      where.endDate = { gte: new Date() };
    } else if (status === 'upcoming') {
      where.startDate = { gt: new Date() };
    } else if (status === 'ended') {
      where.endDate = { lt: new Date() };
    }

    if (type) where.type = type;

    if (joined === 'true') {
      where.participants = { some: { userId: user.id } };
    } else if (joined === 'false') {
      where.participants = { none: { userId: user.id } };
    }

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
            orderBy: { currentValue: 'desc' },
          },
          prizes: true,
          _count: { select: { participants: true } },
        },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.challenge.count({ where }),
    ]);

    const challengesWithStats = challenges.map((challenge) => {
      const isActive = new Date(challenge.startDate) <= new Date() &&
        new Date(challenge.endDate) >= new Date();
      const userParticipation = challenge.participants.find(
        (p) => p.userId === user.id
      );
      const rank = challenge.participants.findIndex(
        (p) => p.userId === user.id
      ) + 1;

      return {
        ...challenge,
        isActive,
        isParticipating: !!userParticipation,
        userRank: rank || null,
        userProgress: userParticipation?.progress || 0,
        spotsLeft: challenge.maxParticipants
          ? challenge.maxParticipants - challenge._count.participants
          : null,
      };
    });

    return NextResponse.json({
      challenges: challengesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/challenges error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
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
    const validation = challengeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prizes, ...challengeData } = validation.data;

    if (new Date(challengeData.startDate) >= new Date(challengeData.endDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.create({
      data: {
        ...challengeData,
        creatorId: user.id,
        isPublic: challengeData.isPublic ?? true,
        maxParticipants: challengeData.maxParticipants || null,
        startDate: new Date(challengeData.startDate),
        endDate: new Date(challengeData.endDate),
        prizes: prizes
          ? {
              create: prizes.map((p) => ({
                place: p.place,
                title: p.title,
                description: p.description || '',
              })),
            }
          : undefined,
        participants: {
          create: {
            userId: user.id,
            currentValue: 0,
            progress: 0,
          },
        },
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        participants: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        prizes: true,
      },
    });

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error('POST /api/challenges error:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge' },
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Challenge ID required' }, { status: 400 });
    }

    const existing = await prisma.challenge.findFirst({
      where: { id, creatorId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Challenge not found or not authorized' },
        { status: 404 }
      );
    }

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const challenge = await prisma.challenge.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, image: true } },
        participants: true,
        prizes: true,
      },
    });

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('PUT /api/challenges error:', error);
    return NextResponse.json(
      { error: 'Failed to update challenge' },
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
      return NextResponse.json({ error: 'Challenge ID required' }, { status: 400 });
    }

    const existing = await prisma.challenge.findFirst({
      where: { id, creatorId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Challenge not found or not authorized' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.challengePrize.deleteMany({ where: { challengeId: id } });
      await tx.challengeParticipant.deleteMany({ where: { challengeId: id } });
      await tx.challenge.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Challenge deleted' });
  } catch (error) {
    console.error('DELETE /api/challenges error:', error);
    return NextResponse.json(
      { error: 'Failed to delete challenge' },
      { status: 500 }
    );
  }
}
