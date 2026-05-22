import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";

import { SupabaseAwareness } from "./awareness";

type UpdatePayload = { update: string; from: string };
type SyncRequestPayload = { from: string; sv?: string };
type SyncReplyPayload = { update: string; from: string; to: string };

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const FALLBACK_FULL_BROADCAST_MS = 1000;

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

export type SupabaseYjsProviderOptions = {
  /**
   * When true (default), the provider also hosts a `SupabaseAwareness` on the
   * same channel for cursor/selection presence. Disable to opt out.
   */
  withAwareness?: boolean;
};

export class SupabaseYjsProvider {
  public readonly awareness: SupabaseAwareness | null;

  private channel: RealtimeChannel | null = null;
  private readonly clientId: string;
  private readonly handleUpdate: (update: Uint8Array, origin: unknown) => void;
  private subscribed = false;
  private destroyed = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private gotSyncReply = false;

  constructor(
    public readonly boardId: string,
    public readonly doc: Y.Doc,
    public readonly supabase: SupabaseClient,
    options: SupabaseYjsProviderOptions = {},
  ) {
    this.clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    this.awareness =
      options.withAwareness === false
        ? null
        : new SupabaseAwareness(boardId, supabase);

    this.handleUpdate = (update, origin) => {
      if (origin === this) return; // applied from remote, don't echo
      this.broadcastUpdate(update);
    };
    this.doc.on("update", this.handleUpdate);

    this.connect();
  }

  /**
   * The Yjs origin tag used when applying remote updates locally. Callers can
   * read this to filter their own observers (the existing binding compares
   * against the provider instance directly, so this is informational).
   */
  get origin(): SupabaseYjsProvider {
    return this;
  }

  private connect() {
    if (this.destroyed) return;
    this.channel = this.supabase.channel(`board:${this.boardId}`, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: this.clientId },
      },
    });
    this.awareness?.attach(this.channel);

    this.channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
      const p = payload as UpdatePayload;
      if (!p || p.from === this.clientId) return;
      Y.applyUpdate(this.doc, fromBase64(p.update), this);
    });

    // State-vector handshake (P2 cleanup, see #7).
    //
    // Before: every join blasted the entire doc to every peer. With N peers
    // and a heavy board that's O(N * docSize) on each connect/reconnect.
    //
    // Now: on join we send our state vector via `yjs-sync-request`. Any peer
    // ahead of us replies with `yjs-sync-reply` containing just the diff
    // (`encodeStateAsUpdate(doc, theirVector)`). If nobody answers within
    // `FALLBACK_FULL_BROADCAST_MS` we fall back to a full-state broadcast so
    // first-connect / single-peer scenarios still converge.
    this.channel.on(
      "broadcast",
      { event: "yjs-sync-request" },
      ({ payload }) => {
        const p = payload as SyncRequestPayload;
        if (!p || p.from === this.clientId) return;
        const diff = p.sv
          ? Y.encodeStateAsUpdate(this.doc, fromBase64(p.sv))
          : Y.encodeStateAsUpdate(this.doc);
        // Skip if there's nothing new for that peer (empty update is 2 bytes).
        if (diff.length <= 2) return;
        void this.channel?.send({
          type: "broadcast",
          event: "yjs-sync-reply",
          payload: {
            update: toBase64(diff),
            from: this.clientId,
            to: p.from,
          } satisfies SyncReplyPayload,
        });
      },
    );

    this.channel.on(
      "broadcast",
      { event: "yjs-sync-reply" },
      ({ payload }) => {
        const p = payload as SyncReplyPayload;
        if (!p || p.from === this.clientId) return;
        if (p.to && p.to !== this.clientId) return;
        this.gotSyncReply = true;
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
        Y.applyUpdate(this.doc, fromBase64(p.update), this);
      },
    );

    this.channel.subscribe((status) => {
      if (this.destroyed) return;
      if (status === "SUBSCRIBED") {
        this.subscribed = true;
        this.reconnectAttempt = 0;
        this.gotSyncReply = false;

        // Ask peers for the diff we're missing.
        const sv = Y.encodeStateVector(this.doc);
        void this.channel?.send({
          type: "broadcast",
          event: "yjs-sync-request",
          payload: {
            from: this.clientId,
            sv: toBase64(sv),
          } satisfies SyncRequestPayload,
        });

        // Fallback: if no peer replied in time, broadcast full state so any
        // peer that joined since us but is behind catches up. Cheap when
        // we're alone (no listeners), still bounded for typical cases.
        if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
        this.fallbackTimer = setTimeout(() => {
          this.fallbackTimer = null;
          if (this.destroyed || !this.subscribed) return;
          if (this.gotSyncReply) return;
          this.broadcastUpdate(Y.encodeStateAsUpdate(this.doc));
        }, FALLBACK_FULL_BROADCAST_MS);

        this.awareness?.onChannelReady();
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
        this.awareness?.onChannelClosed();
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect() {
    if (this.destroyed) return;
    if (this.reconnectTimer) return;
    this.subscribed = false;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    const delay =
      BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.destroyed) return;
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

  private broadcastUpdate(update: Uint8Array) {
    if (!this.channel || !this.subscribed) return;
    if (update.length <= 2) return; // empty update
    void this.channel.send({
      type: "broadcast",
      event: "yjs-update",
      payload: {
        update: toBase64(update),
        from: this.clientId,
      } satisfies UpdatePayload,
    });
  }

  destroy() {
    this.destroyed = true;
    this.doc.off("update", this.handleUpdate);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.awareness?.destroy();
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribed = false;
  }
}
