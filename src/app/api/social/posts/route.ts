import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const postSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'workout', 'achievement', 'progress', 'photo']).optional(),
  workoutId: z.string().optional(),
  achievementId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  visibility: z.enum(['public', 'followers', 'private']).optional(),
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: any = {};

    if (userId) {
      where.authorId = userId;
    } else {
      where.authorId = user.id;
    }

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
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
          tags: true,
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
            take: 5,
          },
          _count: {
            select: { likes: true, comments: true, shares: true },
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

    return NextResponse.json({
      posts: postsWithUserData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/social/posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
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
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tags, workoutId, achievementId, ...postData } = validation.data;

    if (workoutId) {
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId: user.id },
      });
      if (!workout) {
        return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
      }
    }

    if (achievementId) {
      const achievement = await prisma.achievement.findFirst({
        where: { id: achievementId, userId: user.id },
      });
      if (!achievement) {
        return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
      }
    }

    const post = await prisma.post.create({
      data: {
        ...postData,
        authorId: user.id,
        type: postData.type || 'text',
        visibility: postData.visibility || 'public',
        workoutId: workoutId || null,
        achievementId: achievementId || null,
        imageUrl: postData.imageUrl || null,
        tags: tags
          ? {
              create: tags.map((tag) => ({
                name: tag.toLowerCase().trim(),
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
        tags: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      select: { followerId: true },
    });

    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        type: 'NEW_POST',
        title: 'New Post',
        message: `${user.name} shared a new post`,
        referenceId: post.id,
        referenceType: 'post',
      })),
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('POST /api/social/posts error:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
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
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    const post = await prisma.post.findFirst({
      where: { id, authorId: user.id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.postTag.deleteMany({ where: { postId: id } });
      await tx.postLike.deleteMany({ where: { postId: id } });
      await tx.comment.deleteMany({ where: { postId: id } });
      await tx.postShare.deleteMany({ where: { postId: id } });
      await tx.post.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('DELETE /api/social/posts error:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
