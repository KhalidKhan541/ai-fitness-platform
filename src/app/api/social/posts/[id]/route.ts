import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
});

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

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, image: true, bio: true },
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
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, image: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { likes: true, comments: true, shares: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const isLiked = post.likes.some((like) => like.userId === user.id);

    const authorStats = await prisma.post.aggregate({
      where: { authorId: post.authorId },
      _count: { id: true },
    });

    const followerCount = await prisma.follow.count({
      where: { followingId: post.authorId },
    });

    return NextResponse.json({
      post: {
        ...post,
        isLiked,
        isAuthor: post.authorId === user.id,
      },
      authorStats: {
        totalPosts: authorStats._count.id,
        followers: followerCount,
      },
    });
  } catch (error) {
    console.error('GET /api/social/posts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
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

    const existing = await prisma.post.findFirst({
      where: { id: params.id, authorId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
    }

    const body = await request.json();
    const { content, tags, visibility } = body;

    const post = await prisma.$transaction(async (tx) => {
      if (tags) {
        await tx.postTag.deleteMany({ where: { postId: params.id } });
      }

      return tx.post.update({
        where: { id: params.id },
        data: {
          ...(content && { content }),
          ...(visibility && { visibility }),
          ...(tags && {
            tags: {
              create: tags.map((tag: string) => ({
                name: tag.toLowerCase().trim(),
              })),
            },
          }),
          updatedAt: new Date(),
        },
        include: {
          author: { select: { id: true, name: true, image: true } },
          tags: true,
          _count: { select: { likes: true, comments: true } },
        },
      });
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('PUT /api/social/posts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
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

    const post = await prisma.post.findFirst({
      where: { id: params.id, authorId: user.id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found or not authorized' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.postTag.deleteMany({ where: { postId: params.id } });
      await tx.postLike.deleteMany({ where: { postId: params.id } });
      await tx.comment.deleteMany({ where: { postId: params.id } });
      await tx.postShare.deleteMany({ where: { postId: params.id } });
      await tx.post.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('DELETE /api/social/posts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const action = body.action;

    if (action === 'like') {
      const existingLike = await prisma.postLike.findFirst({
        where: { postId: params.id, userId: user.id },
      });

      if (existingLike) {
        await prisma.postLike.delete({
          where: { id: existingLike.id },
        });
        return NextResponse.json({ liked: false });
      }

      await prisma.postLike.create({
        data: { postId: params.id, userId: user.id },
      });

      const post = await prisma.post.findUnique({
        where: { id: params.id },
        select: { authorId: true },
      });

      if (post && post.authorId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: 'POST_LIKE',
            title: 'New Like',
            message: `${user.name} liked your post`,
            referenceId: params.id,
            referenceType: 'post',
          },
        });
      }

      return NextResponse.json({ liked: true });
    }

    if (action === 'comment') {
      const validation = commentSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const comment = await prisma.comment.create({
        data: {
          postId: params.id,
          authorId: user.id,
          content: validation.data.content,
          parentId: body.parentId || null,
        },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      const post = await prisma.post.findUnique({
        where: { id: params.id },
        select: { authorId: true },
      });

      if (post && post.authorId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: 'POST_COMMENT',
            title: 'New Comment',
            message: `${user.name} commented on your post`,
            referenceId: params.id,
            referenceType: 'post',
          },
        });
      }

      return NextResponse.json({ comment }, { status: 201 });
    }

    if (action === 'share') {
      const existingShare = await prisma.postShare.findFirst({
        where: { postId: params.id, userId: user.id },
      });

      if (existingShare) {
        return NextResponse.json({ error: 'Already shared' }, { status: 409 });
      }

      await prisma.postShare.create({
        data: { postId: params.id, userId: user.id },
      });

      return NextResponse.json({ shared: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/social/posts/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
