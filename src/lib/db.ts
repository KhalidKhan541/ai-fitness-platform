import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ─── Soft Delete Helpers ──────────────────────────────

export interface SoftDeleteOptions {
  deletedAt?: Date;
}

/**
 * Soft-delete a record by setting isActive = false.
 * For models that support it, also sets deletedAt.
 */
export async function softDelete<T extends Record<string, unknown>>(
  model: { update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<T> },
  where: Record<string, unknown>,
): Promise<T> {
  return model.update({
    where,
    data: {
      isActive: false,
      deletedAt: new Date(),
    } as Record<string, unknown>,
  }) as unknown as T;
}

/**
 * Restore a soft-deleted record.
 */
export async function restore<T extends Record<string, unknown>>(
  model: { update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<T> },
  where: Record<string, unknown>,
): Promise<T> {
  return model.update({
    where,
    data: {
      isActive: true,
      deletedAt: null,
    } as Record<string, unknown>,
  }) as unknown as T;
}

// ─── Pagination ───────────────────────────────────────

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function paginate<T>(
  model: {
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
  },
  options: PaginationOptions & {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    select?: Record<string, unknown>;
  },
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    limit = 20,
    orderBy = "createdAt",
    order = "desc",
    where = {},
    include,
    select,
  } = options;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    } as Record<string, unknown>),
    model.count({ where } as Record<string, unknown>),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// ─── Cursor Pagination ────────────────────────────────

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function cursorPaginate<T extends { id: string }>(
  model: {
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
  },
  options: CursorPaginationOptions & {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    select?: Record<string, unknown>;
  },
): Promise<CursorPaginatedResult<T>> {
  const {
    cursor,
    limit = 20,
    orderBy = "createdAt",
    order = "desc",
    where = {},
    include,
    select,
  } = options;

  const data = await model.findMany({
    where: {
      ...where,
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    include,
    select,
    orderBy: { [orderBy]: order },
    take: limit + 1,
  } as Record<string, unknown>);

  const hasMore = data.length > limit;
  const sliced = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

  return {
    data: sliced,
    nextCursor,
    hasMore,
  };
}

// ─── Transaction Helpers ──────────────────────────────

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}

// ─── Batch Operations ─────────────────────────────────

export async function batchUpsert<T extends { id: string }>(
  model: {
    upsert: (args: Record<string, unknown>) => Promise<T>;
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
  },
  items: Array<T & { id: string }>,
  uniqueFields: string[],
): Promise<T[]> {
  const results = await Promise.all(
    items.map((item) =>
      model.upsert({
        where: uniqueFields.reduce(
          (acc, field) => ({ ...acc, [field]: (item as Record<string, unknown>)[field] }),
          {} as Record<string, unknown>,
        ),
        create: item,
        update: item,
      } as Record<string, unknown>),
    ),
  );

  return results;
}

// ─── Aggregate Helpers ────────────────────────────────

export async function aggregateSum(
  model: {
    aggregate: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  },
  field: string,
  where: Record<string, unknown> = {},
): Promise<number> {
  const result = await model.aggregate({
    where,
    _sum: { [field]: true },
  } as Record<string, unknown>);

  const sum = (result as Record<string, Record<string, number>>)?._sum?.[field];
  return sum ?? 0;
}

export async function aggregateCount(
  model: {
    count: (args: Record<string, unknown>) => Promise<number>;
  },
  where: Record<string, unknown> = {},
): Promise<number> {
  return model.count({ where } as Record<string, unknown>);
}

// ─── Connection Health ────────────────────────────────

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
