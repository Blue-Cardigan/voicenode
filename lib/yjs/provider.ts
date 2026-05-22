import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import * as Y from "yjs";

type Payload = { update: string; from: string };

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
      if (status === "SUBSCRIBED" && !this.subscribed) {
        this.subscribed = true;
        // Ask peers for their state, and send ours.
        this.channel?.send({
          type: "broadcast",
          event: "yjs-sync-request",
          payload: { from: this.clientId },
        });
        this.broadcast(Y.encodeStateAsUpdate(this.doc));
      }
    });
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
    this.doc.off("update", this.handleUpdate);
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribed = false;
  }
}
