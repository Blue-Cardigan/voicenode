import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";

type Payload = { update: string; from: string };

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

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

export class SupabaseYjsProvider {
  private channel: RealtimeChannel | null = null;
  private readonly clientId: string;
  private readonly handleUpdate: (update: Uint8Array, origin: unknown) => void;
  private subscribed = false;
  private destroyed = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public readonly boardId: string,
    public readonly doc: Y.Doc,
    public readonly supabase: SupabaseClient,
  ) {
    this.clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    this.handleUpdate = (update, origin) => {
      if (origin === this) return; // applied from remote, don't echo
      this.broadcast(update);
    };
    this.doc.on("update", this.handleUpdate);

    this.connect();
  }

  private connect() {
    if (this.destroyed) return;
    this.channel = this.supabase.channel(`board:${this.boardId}`, {
      config: { broadcast: { ack: false, self: false }, presence: { key: this.clientId } },
    });

    this.channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
      const p = payload as Payload;
      if (!p || p.from === this.clientId) return;
      Y.applyUpdate(this.doc, fromBase64(p.update), this);
    });

    this.channel.on("broadcast", { event: "yjs-sync-request" }, ({ payload }) => {
      const p = payload as { from: string };
      if (!p || p.from === this.clientId) return;
      this.broadcast(Y.encodeStateAsUpdate(this.doc));
    });

    this.channel.subscribe((status) => {
      if (this.destroyed) return;
      if (status === "SUBSCRIBED") {
        this.subscribed = true;
        this.reconnectAttempt = 0;
        // Ask peers for their state, and re-broadcast our full state to
        // recover any diverged peers after a reconnect.
        this.channel?.send({
          type: "broadcast",
          event: "yjs-sync-request",
          payload: { from: this.clientId },
        });
        this.broadcast(Y.encodeStateAsUpdate(this.doc));
        return;
      }
      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        console.warn(
          `[SupabaseYjsProvider] channel ${status} for board:${this.boardId}; scheduling reconnect`,
        );
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect() {
    if (this.destroyed) return;
    if (this.reconnectTimer) return;
    this.subscribed = false;

    const delay =
      BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.destroyed) return;
      // Tear down old channel before re-creating.
      if (this.channel) {
        try {
          void this.supabase.removeChannel(this.channel);
        } catch {
          // ignore
        }
        this.channel = null;
      }
      this.connect();
    }, delay);
  }

  private broadcast(update: Uint8Array) {
    if (!this.channel || !this.subscribed) return;
    void this.channel.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: toBase64(update), from: this.clientId } satisfies Payload,
    });
  }

  destroy() {
    this.destroyed = true;
    this.doc.off("update", this.handleUpdate);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribed = false;
  }
}
