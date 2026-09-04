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
        },
        prizes: { orderBy: { place: 'asc' } },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const leaderboard = challenge.participants
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((participant, index) => ({
        rank: index + 1,
        user: participant.user,
        currentValue: participant.currentValue,
        progress: participant.progress,
        joinedAt: participant.joinedAt,
        lastUpdated: participant.lastUpdated,
        isCurrentUser: participant.userId === user.id,
      }));

    const userEntry = leaderboard.find((e) => e.isCurrentUser);

    const stats = {
      totalParticipants: leaderboard.length,
      averageProgress: leaderboard.length > 0
        ? Math.round(
            leaderboard.reduce((acc, e) => acc + e.progress, 0) /
              leaderboard.length
          )
        : 0,
      medianProgress: leaderboard.length > 0
        ? leaderboard[Math.floor(leaderboard.length / 2)].progress
        : 0,
      topPercentile: userEntry
        ? Math.round(
            (leaderboard.filter((e) => e.progress > userEntry.progress).length /
              leaderboard.length) *
              100
          )
        : null,
      prizes: challenge.prizes,
    };

    const recentActivity = await prisma.challengeParticipant.findMany({
      where: {
        challengeId: params.id,
        lastUpdated: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { lastUpdated: 'desc' },
      take: 10,
    });

    const progressDistribution = {
      notStarted: leaderboard.filter((e) => e.progress === 0).length,
      inProgress: leaderboard.filter((e) => e.progress > 0 && e.progress < 50).length,
      halfway: leaderboard.filter((e) => e.progress >= 50 && e.progress < 75).length,
      almostDone: leaderboard.filter((e) => e.progress >= 75 && e.progress < 100).length,
      completed: leaderboard.filter((e) => e.progress >= 100).length,
    };

    return NextResponse.json({
      challengeId: params.id,
      challengeTitle: challenge.title,
      leaderboard,
      stats,
      recentActivity,
      progressDistribution,
      userEntry: userEntry || null,
    });
  } catch (error) {
    console.error('GET /api/challenges/[id]/leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
