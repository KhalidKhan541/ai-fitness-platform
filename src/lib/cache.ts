import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });
  }
  return redisClient;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number = 300
): Promise<void> {
  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttl > 0) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch {
    // silent fail for cache
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch {
    // silent fail
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // silent fail
  }
}

export async function cacheExists(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch {
    return false;
  }
}

export async function cacheTTL(key: string): Promise<number> {
  try {
    const client = getRedisClient();
    return await client.ttl(key);
  } catch {
    return -1;
  }
}

export async function cacheIncrement(
  key: string,
  amount: number = 1
): Promise<number> {
  try {
    const client = getRedisClient();
    return await client.incrby(key, amount);
  } catch {
    return 0;
  }
}

export async function cacheSetHash(
  key: string,
  data: Record<string, string>,
  ttl?: number
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.hset(key, data);
    if (ttl && ttl > 0) {
      await client.expire(key, ttl);
    }
  } catch {
    // silent fail
  }
}

export async function cacheGetHash(key: string): Promise<Record<string, string> | null> {
  try {
    const client = getRedisClient();
    const data = await client.hgetall(key);
    if (Object.keys(data).length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export async function cacheSetAdd(
  key: string,
  ...values: string[]
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.sadd(key, ...values);
  } catch {
    // silent fail
  }
}

export async function cacheSetMembers(key: string): Promise<string[]> {
  try {
    const client = getRedisClient();
    return await client.smembers(key);
  } catch {
    return [];
  }
}

export async function cacheSetRemove(
  key: string,
  ...values: string[]
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.srem(key, ...values);
  } catch {
    // silent fail
  }
}

export async function cacheListPush(
  key: string,
  ...values: string[]
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.rpush(key, ...values);
  } catch {
    // silent fail
  }
}

export async function cacheListPop(key: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.lpop(key);
  } catch {
    return null;
  }
}

export async function cacheListRange(
  key: string,
  start: number = 0,
  stop: number = -1
): Promise<string[]> {
  try {
    const client = getRedisClient();
    return await client.lrange(key, start, stop);
  } catch {
    return [];
  }
}

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(key, data, ttl);
  return data;
}

export async function cacheRevalidate(
  key: string,
  fetcher: () => Promise<unknown>,
  ttl: number = 300
): Promise<void> {
  const data = await fetcher();
  await cacheSet(key, data, ttl);
}

export async function cacheWarmUp(
  entries: Array<{ key: string; fetcher: () => Promise<unknown>; ttl?: number }>
): Promise<void> {
  await Promise.allSettled(
    entries.map(async ({ key, fetcher, ttl = 300 }) => {
      const data = await fetcher();
      await cacheSet(key, data, ttl);
    })
  );
}

export async function getRedisStats(): Promise<{
  connected: boolean;
  memory: string;
  keys: number;
}> {
  try {
    const client = getRedisClient();
    const info = await client.info("memory");
    const memMatch = info.match(/used_memory_human:(\S+)/);
    const dbSize = await client.dbsize();
    return {
      connected: client.status === "ready",
      memory: memMatch?.[1] || "unknown",
      keys: dbSize,
    };
  } catch {
    return { connected: false, memory: "unknown", keys: 0 };
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
