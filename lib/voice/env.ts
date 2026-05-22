import "server-only";

export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
export const ELEVENLABS_AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
  process.env.ELEVENLABS_AGENT_ID ??
  "";
