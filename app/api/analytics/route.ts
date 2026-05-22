import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { event?: string; props?: Record<string, unknown> }
      | null;

    if (body && typeof body.event === "string") {
      // TODO: forward to PostHog / Segment / etc. when wired up.
      console.log("[analytics:server]", body.event, body.props ?? {});
    }
  } catch {
    // No-op — analytics must never throw.
  }

  return new NextResponse(null, { status: 204 });
}
