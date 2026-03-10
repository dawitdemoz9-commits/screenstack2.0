/**
 * In-process sliding-window rate limiter.
 *
 * For a single-server deployment this is fine.
 * For multi-instance/edge deployments replace with Redis:
 *   - Use `ioredis` + ZADD/ZREMRANGEBYSCORE pattern
 *   - Or use Upstash @upstash/ratelimit
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Clean up old entries every 5 minutes so the map doesn't grow forever
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  });
}, 5 * 60 * 1000);

interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetAfter: number; // seconds until the oldest request ages out
}

/**
 * Check whether `key` is within the allowed rate.
 *
 * @param key        Identifier (e.g. IP address, user id)
 * @param limit      Maximum requests in `windowSec` seconds
 * @param windowSec  Window size in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): RateLimitResult {
  const now    = Date.now();
  const cutoff = now - windowSec * 1000;

  const entry = store.get(key) ?? { timestamps: [] };
  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  store.set(key, entry);

  if (entry.timestamps.length >= limit) {
    const oldest     = entry.timestamps[0];
    const resetAfter = Math.ceil((oldest + windowSec * 1000 - now) / 1000);
    return { allowed: false, remaining: 0, resetAfter };
  }

  entry.timestamps.push(now);
  return {
    allowed:    true,
    remaining:  limit - entry.timestamps.length,
    resetAfter: 0,
  };
}

/**
 * Get the requester's IP from a Next.js request.
 * Honours common proxy headers (Vercel, Cloudflare, nginx).
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
