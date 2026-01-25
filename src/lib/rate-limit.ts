type RateLimitEntry = {
  count: number;
  firstAttempt: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; resetInMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry) {
    rateLimitMap.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetInMs: WINDOW_MS };
  }

  const timeSinceFirst = now - entry.firstAttempt;

  if (timeSinceFirst > WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetInMs: WINDOW_MS };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const resetInMs = WINDOW_MS - timeSinceFirst;
    return { allowed: false, remainingAttempts: 0, resetInMs };
  }

  entry.count++;
  rateLimitMap.set(key, entry);
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - entry.count, resetInMs: WINDOW_MS - timeSinceFirst };
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000);
