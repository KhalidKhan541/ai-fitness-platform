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
    const type = searchParams.get('type') || 'followers';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    let where: any;
    let include: any = {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          _count: {
            select: { followers: true, workouts: true },
          },
        },
      },
    };

    if (type === 'followers') {
      where = { followingId: user.id };
    } else if (type === 'following') {
      where = { followerId: user.id };
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.follow.count({ where }),
    ]);

    const userIds = follows.map((f) =>
      type === 'followers' ? f.followerId : f.followingId
    );

    const mutualFollows = await prisma.follow.findMany({
      where: {
        followerId: user.id,
        followingId: { in: userIds },
      },
      select: { followingId: true },
    });

    const mutualSet = new Set(mutualFollows.map((f) => f.followingId));

    const usersWithRelation = follows.map((f) => ({
      ...f.user,
      followsYou: type === 'following' ? true : mutualSet.has(f.user.id),
      youFollow: type === 'followers' ? mutualSet.has(f.user.id) : true,
      followedAt: f.createdAt,
    }));

    return NextResponse.json({
      users: usersWithRelation,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/social/follow error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow data' },
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
    const { targetUserId, action } = body;

    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'targetUserId and action required' },
        { status: 400 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, isPublic: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'follow') {
      const existingFollow = await prisma.follow.findFirst({
        where: { followerId: user.id, followingId: targetUserId },
      });

      if (existingFollow) {
        return NextResponse.json(
          { error: 'Already following' },
          { status: 409 }
        );
      }

      await prisma.follow.create({
        data: { followerId: user.id, followingId: targetUserId },
      });

      await prisma.userStats.update({
        where: { userId: user.id },
        data: { totalFollowing: { increment: 1 } },
      });

      await prisma.userStats.update({
        where: { userId: targetUserId },
        data: { totalFollowers: { increment: 1 } },
      });

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'NEW_FOLLOWER',
          title: 'New Follower',
          message: `${user.name} started following you`,
          referenceId: user.id,
          referenceType: 'user',
        },
      });

      return NextResponse.json({ following: true });
    }

    if (action === 'unfollow') {
      const existingFollow = await prisma.follow.findFirst({
        where: { followerId: user.id, followingId: targetUserId },
      });

      if (!existingFollow) {
        return NextResponse.json(
          { error: 'Not following' },
          { status: 404 }
        );
      }

      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });

      await prisma.userStats.update({
        where: { userId: user.id },
        data: { totalFollowing: { decrement: 1 } },
      });

      await prisma.userStats.update({
        where: { userId: targetUserId },
        data: { totalFollowers: { decrement: 1 } },
      });

      return NextResponse.json({ following: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/social/follow error:', error);
    return NextResponse.json(
      { error: 'Failed to perform follow action' },
      { status: 500 }
    );
  }
}
