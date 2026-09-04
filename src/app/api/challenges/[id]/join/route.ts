import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
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

    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { participants: true } },
        participants: { where: { userId: user.id } },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const isActive = new Date(challenge.startDate) <= new Date() &&
      new Date(challenge.endDate) >= new Date();

    if (!isActive) {
      return NextResponse.json(
        { error: 'Challenge is not active' },
        { status: 400 }
      );
    }

    if (challenge.participants.length > 0) {
      return NextResponse.json(
        { error: 'Already participating in this challenge' },
        { status: 409 }
      );
    }

    if (
      challenge.maxParticipants &&
      challenge._count.participants >= challenge.maxParticipants
    ) {
      return NextResponse.json(
        { error: 'Challenge is full' },
        { status: 400 }
      );
    }

    const participation = await prisma.challengeParticipant.create({
      data: {
        challengeId: params.id,
        userId: user.id,
        currentValue: 0,
        progress: 0,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(
      {
        message: 'Successfully joined challenge',
        participation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/challenges/[id]/join error:', error);
    return NextResponse.json(
      { error: 'Failed to join challenge' },
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

    const participation = await prisma.challengeParticipant.findFirst({
      where: {
        challengeId: params.id,
        userId: user.id,
      },
    });

    if (!participation) {
      return NextResponse.json(
        { error: 'Not participating in this challenge' },
        { status: 404 }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id },
    });

    if (challenge?.creatorId === user.id) {
      return NextResponse.json(
        { error: 'Creator cannot leave their own challenge' },
        { status: 400 }
      );
    }

    const isEnded = new Date(challenge!.endDate) < new Date();
    if (isEnded) {
      return NextResponse.json(
        { error: 'Cannot leave a challenge that has ended' },
        { status: 400 }
      );
    }

    await prisma.challengeParticipant.delete({
      where: { id: participation.id },
    });

    return NextResponse.json({ message: 'Left challenge successfully' });
  } catch (error) {
    console.error('DELETE /api/challenges/[id]/join error:', error);
    return NextResponse.json(
      { error: 'Failed to leave challenge' },
      { status: 500 }
    );
  }
}
