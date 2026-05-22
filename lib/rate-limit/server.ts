import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function rateLimitBump(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean }> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase.rpc("bump_rate_limit", {
    p_bucket: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  // Fail open: never lock users out because Postgres hiccuped.
  if (error) return { allowed: true };
  return { allowed: data === true };
}

/**
 * Derive a stable per-IP bucket key from request headers. Reads
 * `x-forwarded-for` (set by Vercel and most edge proxies) and falls back to
 * `x-real-ip` and finally `"unknown"`.
 */
export async function ipBucketKey(prefix: string): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const realIp = h.get("x-real-ip");
  const ip = (fwd?.split(",")[0] ?? realIp ?? "unknown").trim() || "unknown";
  return `${prefix}:${ip}`;
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
