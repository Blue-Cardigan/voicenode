import { NextResponse } from "next/server";
import { ELEVENLABS_AGENT_ID, ELEVENLABS_API_KEY } from "@/lib/voice/env";
import { TokenBucket } from "@/lib/rate-limit/in-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP token bucket persisted across requests on the same Fluid Compute
// instance. 30 tokens, refilled at 0.5/sec (≈30/min) — plenty for a real
// user, enough to choke off a runaway client.
const bucket = new TokenBucket(30, 0.5);

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Vercel BotID. In local dev (no `VERCEL_ENV`) we skip silently. The dynamic
// import keeps a fresh checkout from blowing up before `pnpm install` runs.
async function isBotRequest(): Promise<boolean> {
  if (!process.env.VERCEL_ENV) return false;
  try {
    const mod = await import("botid/server");
    const verification = await mod.checkBotId();
    return verification.isBot === true;
  } catch {
    // If BotID is unavailable for any reason, fail open. Rate-limiting still
    // provides baseline protection.
    return false;
  }
}

export async function GET(request: Request) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID not configured on the server." },
      { status: 500 },
    );
  }

  // Same-origin gate: refuse cross-site invocations to limit drive-by token minting.
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  const allowed = host ? [`https://${host}`, `http://${host}`] : [];
  const callerOrigin = origin ?? (referer ? new URL(referer).origin : null);
  if (callerOrigin && !allowed.includes(callerOrigin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isBotRequest()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIp(request);
  if (!bucket.tryConsume(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again shortly." },
      { status: 429 },
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(ELEVENLABS_AGENT_ID)}`,
    {
      method: "GET",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `ElevenLabs token request failed (${res.status}): ${text}` },
      { status: 502 },
    );
  }

  const { token } = (await res.json()) as { token: string };
  return NextResponse.json({ token, agentId: ELEVENLABS_AGENT_ID });
}
