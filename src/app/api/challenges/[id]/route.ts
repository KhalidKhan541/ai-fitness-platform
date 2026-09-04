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

    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { currentValue: 'desc' },
        },
        prizes: { orderBy: { place: 'asc' } },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const isActive = new Date(challenge.startDate) <= new Date() &&
      new Date(challenge.endDate) >= new Date();
    const isEnded = new Date(challenge.endDate) < new Date();
    const userParticipation = challenge.participants.find(
      (p) => p.userId === user.id
    );

    const leaderboard = challenge.participants.map((p, index) => ({
      rank: index + 1,
      user: p.user,
      currentValue: p.currentValue,
      progress: p.progress,
      joinedAt: p.joinedAt,
      lastUpdated: p.lastUpdated,
    }));

    const stats = {
      totalParticipants: challenge.participants.length,
      maxParticipants: challenge.maxParticipants,
      averageProgress: challenge.participants.length > 0
        ? Math.round(
            challenge.participants.reduce((acc, p) => acc + p.progress, 0) /
              challenge.participants.length
          )
        : 0,
      topPerformer: leaderboard[0] || null,
    };

    return NextResponse.json({
      challenge,
      leaderboard,
      stats,
      isActive,
      isEnded,
      isParticipating: !!userParticipation,
      userParticipation: userParticipation || null,
      userRank: userParticipation
        ? challenge.participants.findIndex((p) => p.userId === user.id) + 1
        : null,
    });
  } catch (error) {
    console.error('GET /api/challenges/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
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

    const existing = await prisma.challenge.findFirst({
      where: { id: params.id, creatorId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Challenge not found or not authorized' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, ...updateData } = body;

    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const challenge = await prisma.challenge.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, image: true } },
        participants: true,
        prizes: true,
      },
    });

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('PUT /api/challenges/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update challenge' },
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

    const existing = await prisma.challenge.findFirst({
      where: { id: params.id, creatorId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Challenge not found or not authorized' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.challengePrize.deleteMany({ where: { challengeId: params.id } });
      await tx.challengeParticipant.deleteMany({ where: { challengeId: params.id } });
      await tx.challenge.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'Challenge deleted' });
  } catch (error) {
    console.error('DELETE /api/challenges/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete challenge' },
      { status: 500 }
    );
  }
}
