import { cacheGet, cacheSet, cacheIncrement, cacheDel } from "./cache";

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;
  refillInterval: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetIn: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  api: { maxTokens: 100, refillRate: 10, refillInterval: 60000 },
  auth: { maxTokens: 10, refillRate: 1, refillInterval: 60000 },
  upload: { maxTokens: 20, refillRate: 2, refillInterval: 60000 },
  ai: { maxTokens: 30, refillRate: 3, refillInterval: 60000 },
  webhook: { maxTokens: 50, refillRate: 5, refillInterval: 60000 },
};

async function getBucket(
  key: string,
  config: RateLimitConfig
): Promise<TokenBucket> {
  const cached = await cacheGet<TokenBucket>(`ratelimit:${key}`);
  if (cached) return cached;

  return {
    tokens: config.maxTokens,
    lastRefill: Date.now(),
  };
}

async function saveBucket(key: string, bucket: TokenBucket): Promise<void> {
  const ttl = 300;
  await cacheSet(`ratelimit:${key}`, bucket, ttl);
}

function refillTokens(bucket: TokenBucket, config: RateLimitConfig): TokenBucket {
  const now = Date.now();
  const timePassed = now - bucket.lastRefill;
  const refillCycles = Math.floor(timePassed / config.refillInterval);

  if (refillCycles <= 0) return bucket;

  const newTokens = Math.min(
    config.maxTokens,
    bucket.tokens + refillCycles * config.refillRate
  );

  return {
    tokens: newTokens,
    lastRefill: now,
  };
}

export async function checkRateLimit(
  key: string,
  configName: keyof typeof DEFAULT_CONFIGS | RateLimitConfig = "api"
): Promise<RateLimitResult> {
  const config =
    typeof configName === "string" ? DEFAULT_CONFIGS[configName] : configName;

  const bucket = await getBucket(key, config);
  const refilled = refillTokens(bucket, config);

  const resetIn = Math.max(
    0,
    config.refillInterval - (Date.now() - refilled.lastRefill)
  );

  if (refilled.tokens <= 0) {
    await saveBucket(key, refilled);
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxTokens,
      resetIn,
    };
  }

  refilled.tokens -= 1;
  await saveBucket(key, refilled);

  return {
    allowed: true,
    remaining: refilled.tokens,
    limit: config.maxTokens,
    resetIn,
  };
}

export async function checkAndConsumeToken(
  key: string,
  configName: keyof typeof DEFAULT_CONFIGS | RateLimitConfig = "api"
): Promise<RateLimitResult> {
  return checkRateLimit(key, configName);
}

export async function consumeTokens(
  key: string,
  count: number,
  configName: keyof typeof DEFAULT_CONFIGS | RateLimitConfig = "api"
): Promise<RateLimitResult> {
  const config =
    typeof configName === "string" ? DEFAULT_CONFIGS[configName] : configName;

  const bucket = await getBucket(key, config);
  const refilled = refillTokens(bucket, config);

  const resetIn = Math.max(
    0,
    config.refillInterval - (Date.now() - refilled.lastRefill)
  );

  if (refilled.tokens < count) {
    await saveBucket(key, refilled);
    return {
      allowed: false,
      remaining: refilled.tokens,
      limit: config.maxTokens,
      resetIn,
    };
  }

  refilled.tokens -= count;
  await saveBucket(key, refilled);

  return {
    allowed: true,
    remaining: refilled.tokens,
    limit: config.maxTokens,
    resetIn,
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  await cacheDel(`ratelimit:${key}`);
}

export async function getRateLimitStatus(
  key: string,
  configName: keyof typeof DEFAULT_CONFIGS | RateLimitConfig = "api"
): Promise<RateLimitResult> {
  const config =
    typeof configName === "string" ? DEFAULT_CONFIGS[configName] : configName;

  const bucket = await getBucket(key, config);
  const refilled = refillTokens(bucket, config);

  const resetIn = Math.max(
    0,
    config.refillInterval - (Date.now() - refilled.lastRefill)
  );

  return {
    allowed: refilled.tokens > 0,
    remaining: refilled.tokens,
    limit: config.maxTokens,
    resetIn,
  };
}

export function createRateLimiter(
  config: RateLimitConfig,
  prefix: string = "custom"
) {
  return {
    check: (key: string) => checkRateLimit(`${prefix}:${key}`, config),
    consume: (key: string, count: number = 1) =>
      consumeTokens(`${prefix}:${key}`, count, config),
    reset: (key: string) => resetRateLimit(`${prefix}:${key}`),
    status: (key: string) => getRateLimitStatus(`${prefix}:${key}`, config),
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
    "Retry-After": result.allowed ? "0" : String(Math.ceil(result.resetIn / 1000)),
  };
}

export async function getGlobalRateLimitStats(): Promise<{
  totalKeys: number;
  byPrefix: Record<string, number>;
}> {
  const stats = {
    totalKeys: 0,
    byPrefix: {} as Record<string, number>,
  };

  try {
    const Redis = (await import("ioredis")).default;
    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      lazyConnect: true,
    });

    const keys = await client.keys("ratelimit:*");
    stats.totalKeys = keys.length;

    for (const key of keys) {
      const prefix = key.replace("ratelimit:", "").split(":")[0] || "unknown";
      stats.byPrefix[prefix] = (stats.byPrefix[prefix] || 0) + 1;
    }

    await client.quit();
  } catch {
    // silent fail
  }

  return stats;
}
