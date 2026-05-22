import { NextResponse } from "next/server";
import { ELEVENLABS_AGENT_ID, ELEVENLABS_API_KEY } from "@/lib/voice/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
