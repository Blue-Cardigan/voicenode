import { NextResponse } from "next/server";
import { ELEVENLABS_AGENT_ID, ELEVENLABS_API_KEY } from "@/lib/voice/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured on the server." },
      { status: 500 },
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
