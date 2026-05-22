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

  // On tab hide, best-effort flush via the supabase client so the session JWT
  // is attached (board_snapshots RLS requires the user's JWT — anon won't pass).
  // `visibilitychange === 'hidden'` is more reliable than `beforeunload`
  // (fires on mobile backgrounding, tab switches, and unloads).
  const onVisibilityChange = () => {
    if (document.visibilityState !== "hidden") return;
    if (!pending) return;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void flush();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  return () => {
    ydoc.off("update", onUpdate);
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    // Final best-effort flush before marking destroyed (flush early-returns
    // when destroyed is true).
    if (pending) void flush();
    destroyed = true;
  };
}
