import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const photoSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  type: z.enum(['front', 'back', 'side_left', 'side_right', 'other']),
  date: z.string().optional(),
  notes: z.string().max(500).optional(),
  weight: z.number().min(0).max(500).optional(),
  bodyFatPercentage: z.number().min(0).max(70).optional(),
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
    const type = searchParams.get('type');

    const where: any = { userId: user.id };
    if (type) where.type = type;

    const [photos, total] = await Promise.all([
      prisma.progressPhoto.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.progressPhoto.count({ where }),
    ]);

    const allPhotos = await prisma.progressPhoto.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: 'asc' },
      select: {
        id: true,
        imageUrl: true,
        type: true,
        recordedAt: true,
        weight: true,
        bodyFatPercentage: true,
      },
    });

    const timeline = allPhotos.map((photo, index) => {
      const prevPhoto = index > 0 ? allPhotos[index - 1] : null;
      const weightChange = prevPhoto?.weight && photo.weight
        ? Math.round((photo.weight - prevPhoto.weight) * 10) / 10
        : null;

      return {
        ...photo,
        weightChange,
        daysSincePrevious: prevPhoto
          ? Math.round(
              (new Date(photo.recordedAt).getTime() - new Date(prevPhoto.recordedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      };
    });

    const stats = {
      totalPhotos: total,
      firstPhoto: allPhotos[0]?.recordedAt || null,
      lastPhoto: allPhotos[allPhotos.length - 1]?.recordedAt || null,
      photosByType: ['front', 'back', 'side_left', 'side_right', 'other'].reduce(
        (acc, t) => ({
          ...acc,
          [t]: allPhotos.filter((p) => p.type === t).length,
        }),
        {} as Record<string, number>
      ),
    };

    return NextResponse.json({
      photos,
      timeline,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/progress/photos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
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
    const validation = photoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { imageUrl, thumbnailUrl, type, date, notes, weight, bodyFatPercentage } = validation.data;

    let recordedAt = new Date();
    if (date) recordedAt = new Date(date);

    const photo = await prisma.progressPhoto.create({
      data: {
        userId: user.id,
        imageUrl,
        thumbnailUrl: thumbnailUrl || imageUrl,
        type,
        recordedAt,
        notes: notes || '',
        weight: weight || null,
        bodyFatPercentage: bodyFatPercentage || null,
      },
    });

    if (weight) {
      const recentWeight = await prisma.weightEntry.findFirst({
        where: { userId: user.id },
        orderBy: { recordedAt: 'desc' },
      });

      if (!recentWeight || Math.abs(new Date().getTime() - new Date(recentWeight.recordedAt).getTime()) > 24 * 60 * 60 * 1000) {
        await prisma.weightEntry.create({
          data: {
            userId: user.id,
            weight,
            recordedAt,
            notes: 'Auto-logged from progress photo',
          },
        });
      }
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('POST /api/progress/photos error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
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
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const photo = await prisma.progressPhoto.findFirst({
      where: { id, userId: user.id },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    await prisma.progressPhoto.delete({ where: { id } });

    return NextResponse.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('DELETE /api/progress/photos error:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
