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
    const filter = searchParams.get('filter') || 'all';

    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(user.id);

    let where: any = {
      authorId: { in: followingIds },
    };

    if (filter === 'workouts') {
      where.type = 'workout';
    } else if (filter === 'achievements') {
      where.type = 'achievement';
    } else if (filter === 'progress') {
      where.type = 'progress';
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          workout: {
            select: { id: true, name: true, type: true, duration: true },
          },
          achievement: {
            select: { id: true, title: true, icon: true, points: true },
          },
          likes: {
            select: { userId: true },
          },
          comments: {
            include: {
              author: {
                select: { id: true, name: true, image: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    const postsWithUserData = posts.map((post) => ({
      ...post,
      isLiked: post.likes.some((like) => like.userId === user.id),
      isAuthor: post.authorId === user.id,
    }));

    const trendingTags = await prisma.postTag.groupBy({
      by: ['name'],
      _count: { id: true },
      where: {
        post: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { notIn: followingIds },
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: { followers: true },
        },
      },
      orderBy: { _count: { followers: 'desc' } },
      take: 5,
    });

    return NextResponse.json({
      posts: postsWithUserData,
      trendingTags: trendingTags.map((t) => ({
        name: t.name,
        count: t._count.id,
      })),
      suggestedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/social/feed error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
