import type { SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";

const TABLE = "board_snapshots";
const DEBOUNCE_MS = 5000;

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return typeof btoa !== "undefined"
    ? btoa(s)
    : Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  const bin =
    typeof atob !== "undefined"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Postgres returns bytea as "\\xHEX" string by default over PostgREST.
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function decodeYjsState(value: unknown): Uint8Array | null {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") {
    return value.startsWith("\\x") ? hexToBytes(value) : fromBase64(value);
  }
  return null;
}

export async function loadSnapshot(
  boardId: string,
  supabase: SupabaseClient,
): Promise<Uint8Array | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("yjs_state")
    .eq("board_id", boardId)
    .maybeSingle();
  if (error || !data) return null;
  return decodeYjsState((data as { yjs_state: unknown }).yjs_state);
}

export function attachSnapshotWriter(
  boardId: string,
  ydoc: Y.Doc,
  supabase: SupabaseClient,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  let destroyed = false;

  const flush = async () => {
    if (destroyed) return;
    pending = false;
    const state = Y.encodeStateAsUpdate(ydoc);
    const b64 = toBase64(state);
    // bytea accepts base64 via PostgREST when prefixed with "\x" hex; safest is RPC.
    // PostgREST upsert with raw base64 to a bytea column works when sent as a string.
    await supabase
      .from(TABLE)
      .upsert(
        { board_id: boardId, yjs_state: b64, updated_at: new Date().toISOString() },
        { onConflict: "board_id" },
      );
  };

  const schedule = () => {
    pending = true;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, DEBOUNCE_MS);
  };

  const onUpdate = () => schedule();
  ydoc.on("update", onUpdate);

  const onBeforeUnload = () => {
    if (!pending) return;
    const state = Y.encodeStateAsUpdate(ydoc);
    const b64 = toBase64(state);
    // Best-effort sync flush. PostgREST POST with keepalive.
    const url = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl;
    const key = (supabase as unknown as { supabaseKey?: string }).supabaseKey;
    if (!url || !key) return;
    try {
      void fetch(`${url}/rest/v1/${TABLE}?on_conflict=board_id`, {
        method: "POST",
        keepalive: true,
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          board_id: boardId,
          yjs_state: b64,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch {
      // ignore
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", onBeforeUnload);
  }

  return () => {
    destroyed = true;
    ydoc.off("update", onUpdate);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", onBeforeUnload);
    }
    if (pending) void flush();
  };
}
