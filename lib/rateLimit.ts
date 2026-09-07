interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * In-memory rate-limiter helper.
 * Default: Max 3 requests per 15 minutes (900,000 ms).
 */
export function isRateLimited(
  key: string,
  limit: number = 3,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Clean up expired entries periodically
  if (record && now > record.resetTime) {
    rateLimitMap.delete(key);
  }

  const currentRecord = rateLimitMap.get(key);

  if (!currentRecord) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  if (currentRecord.count >= limit) {
    return true;
  }

  currentRecord.count += 1;
  return false;
}
