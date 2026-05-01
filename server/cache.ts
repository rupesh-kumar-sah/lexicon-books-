import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redis: Redis | null = null;

if (redisUrl) {
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    console.log('[Cache] Redis connected.');
  } catch (e) {
    console.error('[Cache] Redis connection failed, falling back to in-memory.', e);
  }
}

const MEMORY_CACHE = new Map<string, { data: any; expires: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  if (redis) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

export async function setCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    return;
  }
  MEMORY_CACHE.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000,
  });
}

export async function clearCache(pattern: string): Promise<void> {
  if (redis) {
    const keys = await redis.keys(`${pattern}*`);
    if (keys.length > 0) await redis.del(...keys);
    return;
  }
  for (const key of MEMORY_CACHE.keys()) {
    if (key.startsWith(pattern)) MEMORY_CACHE.delete(key);
  }
}
