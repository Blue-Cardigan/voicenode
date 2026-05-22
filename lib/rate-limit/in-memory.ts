// Simple in-memory token bucket. Good enough for a single-region Vercel Fluid
// Compute instance — buckets persist across requests on the same warm instance.
// Across instances, limits are effectively per-instance (more permissive than
// global), which is acceptable as a first line of defence. Swap for Upstash
// when we need cross-instance accuracy.

type BucketState = {
  tokens: number;
  lastRefill: number; // ms
  lastTouched: number; // ms
};

const IDLE_TTL_MS = 5 * 60 * 1000;

export class TokenBucket {
  private buckets = new Map<string, BucketState>();
  private lastSweep = 0;

  constructor(
    public readonly maxTokens: number,
    public readonly refillPerSec: number,
  ) {}

  tryConsume(key: string): boolean {
    const now = Date.now();
    this.maybeSweep(now);
    const existing = this.buckets.get(key);
    const bucket: BucketState = existing
      ? this.refill(existing, now)
      : { tokens: this.maxTokens, lastRefill: now, lastTouched: now };

    bucket.lastTouched = now;
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(key, bucket);
      return true;
    }
    this.buckets.set(key, bucket);
    return false;
  }

  private refill(b: BucketState, now: number): BucketState {
    const elapsedSec = (now - b.lastRefill) / 1000;
    const tokens = Math.min(this.maxTokens, b.tokens + elapsedSec * this.refillPerSec);
    return { tokens, lastRefill: now, lastTouched: b.lastTouched };
  }

  private maybeSweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, b] of this.buckets) {
      if (now - b.lastTouched > IDLE_TTL_MS) this.buckets.delete(key);
    }
  }
}
