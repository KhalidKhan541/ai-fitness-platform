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

    const achievement = await prisma.achievement.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    const similarAchievements = await prisma.achievement.findMany({
      where: {
        userId: user.id,
        type: achievement.type,
        id: { not: achievement.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const totalPoints = await prisma.achievement.aggregate({
      where: { userId: user.id },
      _sum: { points: true },
    });

    return NextResponse.json({
      achievement,
      similarAchievements,
      totalPoints: totalPoints._sum.points || 0,
    });
  } catch (error) {
    console.error('GET /api/achievements/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievement' },
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

    const achievement = await prisma.achievement.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    await prisma.achievement.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Achievement deleted' });
  } catch (error) {
    console.error('DELETE /api/achievements/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 }
    );
  }
}
