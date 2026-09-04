import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const foodSchema = z.object({
  name: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  servingSize: z.number().min(0.1).max(1000),
  servingUnit: z.string().max(20),
  caloriesPerServing: z.number().min(0).max(5000),
  proteinPerServing: z.number().min(0).max(500),
  carbsPerServing: z.number().min(0).max(500),
  fatPerServing: z.number().min(0).max(500),
  fiberPerServing: z.number().min(0).max(100).optional(),
  sugarPerServing: z.number().min(0).max(200).optional(),
  sodiumPerServing: z.number().min(0).max(5000).optional(),
  cholesterolPerServing: z.number().min(0).max(1000).optional(),
  category: z.string().max(50).optional(),
  imageUrl: z.string().url().optional(),
});

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

async function searchExternalFood(query: string) {
  const commonFoods = [
    { name: 'Banana', brand: '', caloriesPerServing: 105, proteinPerServing: 1.3, carbsPerServing: 27, fatPerServing: 0.4, fiberPerServing: 3.1, sugarPerServing: 14, servingSize: 118, servingUnit: 'g' },
    { name: 'Apple', brand: '', caloriesPerServing: 95, proteinPerServing: 0.5, carbsPerServing: 25, fatPerServing: 0.3, fiberPerServing: 4.4, sugarPerServing: 19, servingSize: 182, servingUnit: 'g' },
    { name: 'Chicken Breast', brand: '', caloriesPerServing: 165, proteinPerServing: 31, carbsPerServing: 0, fatPerServing: 3.6, fiberPerServing: 0, sugarPerServing: 0, servingSize: 100, servingUnit: 'g' },
    { name: 'Brown Rice', brand: '', caloriesPerServing: 216, proteinPerServing: 5, carbsPerServing: 45, fatPerServing: 1.8, fiberPerServing: 3.5, sugarPerServing: 0.7, servingSize: 195, servingUnit: 'g' },
    { name: 'Salmon', brand: '', caloriesPerServing: 208, proteinPerServing: 20, carbsPerServing: 0, fatPerServing: 13, fiberPerServing: 0, sugarPerServing: 0, servingSize: 100, servingUnit: 'g' },
    { name: 'Egg', brand: '', caloriesPerServing: 78, proteinPerServing: 6, carbsPerServing: 0.6, fatPerServing: 5, fiberPerServing: 0, sugarPerServing: 0.6, servingSize: 50, servingUnit: 'g' },
    { name: 'Oatmeal', brand: '', caloriesPerServing: 154, proteinPerServing: 5, carbsPerServing: 27, fatPerServing: 2.6, fiberPerServing: 4, sugarPerServing: 0.6, servingSize: 234, servingUnit: 'g' },
    { name: 'Greek Yogurt', brand: '', caloriesPerServing: 100, proteinPerServing: 17, carbsPerServing: 6, fatPerServing: 0.7, fiberPerServing: 0, sugarPerServing: 6, servingSize: 170, servingUnit: 'g' },
    { name: 'Almonds', brand: '', caloriesPerServing: 164, proteinPerServing: 6, carbsPerServing: 6, fatPerServing: 14, fiberPerServing: 3.5, sugarPerServing: 1, servingSize: 28, servingUnit: 'g' },
    { name: 'Sweet Potato', brand: '', caloriesPerServing: 103, proteinPerServing: 2.3, carbsPerServing: 24, fatPerServing: 0.1, fiberPerServing: 3.8, sugarPerServing: 7.4, servingSize: 130, servingUnit: 'g' },
    { name: 'Broccoli', brand: '', caloriesPerServing: 55, proteinPerServing: 3.7, carbsPerServing: 11, fatPerServing: 0.6, fiberPerServing: 5.1, sugarPerServing: 2.2, servingSize: 156, servingUnit: 'g' },
    { name: 'Avocado', brand: '', caloriesPerServing: 240, proteinPerServing: 3, carbsPerServing: 13, fatPerServing: 22, fiberPerServing: 10, sugarPerServing: 1, servingSize: 150, servingUnit: 'g' },
  ];

  return commonFoods.filter((food) =>
    food.name.toLowerCase().includes(query.toLowerCase())
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const barcode = searchParams.get('barcode');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const includeCommon = searchParams.get('includeCommon') !== 'false';

    const where: any = {
      OR: [
        { createdByUserId: user.id },
        { isVerified: true },
        { isPublic: true },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (category) where.category = category;
    if (barcode) where.barcode = barcode;

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where,
        orderBy: [
          { isVerified: 'desc' },
          { usageCount: 'desc' },
          { name: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.food.count({ where }),
    ]);

    let results = foods;

    if (search && includeCommon && foods.length < limit) {
      const commonFoods = await searchExternalFood(search);
      const dbNames = foods.map((f) => f.name.toLowerCase());
      const newCommon = commonFoods
        .filter((cf) => !dbNames.includes(cf.name.toLowerCase()))
        .slice(0, limit - foods.length);

      results = [
        ...foods,
        ...newCommon.map((cf) => ({
          ...cf,
          id: `common-${cf.name.toLowerCase().replace(/\s+/g, '-')}`,
          isCommon: true,
          isVerified: true,
          isPublic: true,
          brand: cf.brand || '',
          barcode: null,
          fiberPerServing: cf.fiberPerServing || 0,
          sugarPerServing: cf.sugarPerServing || 0,
          sodiumPerServing: 0,
          cholesterolPerServing: 0,
          imageUrl: null,
          createdByUserId: null,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      ];
    }

    const categories = await prisma.food.groupBy({
      by: ['category'],
      where: { category: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return NextResponse.json({
      foods: results,
      categories: categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('GET /api/nutrition/foods error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch foods' },
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
    const validation = foodSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    if (validation.data.barcode) {
      const existing = await prisma.food.findFirst({
        where: { barcode: validation.data.barcode },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Food with this barcode already exists', existingFood: existing },
          { status: 409 }
        );
      }
    }

    const food = await prisma.food.create({
      data: {
        ...validation.data,
        createdByUserId: user.id,
        isVerified: false,
        isPublic: false,
        usageCount: 0,
      },
    });

    return NextResponse.json({ food }, { status: 201 });
  } catch (error) {
    console.error('POST /api/nutrition/foods error:', error);
    return NextResponse.json(
      { error: 'Failed to create food' },
      { status: 500 }
    );
  }
}
