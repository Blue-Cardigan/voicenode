import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-peer awareness state. Mirrors the subset of fields tldraw needs to render
 * collaborator cursors + selection indicators, plus enough metadata to address
 * peers across the wire.
 */
export type AwarenessState = {
  userId: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedShapeIds: string[];
};

type ChangeListener = (
  states: Map<number, AwarenessState>,
  changes: { added: number[]; updated: number[]; removed: number[] },
) => void;

type Payload =
  | { type: "update"; clock: number; from: number; state: AwarenessState }
  | { type: "request"; from: number }
  | { type: "leave"; from: number };

/**
 * Lightweight awareness implementation that piggy-backs on the same Supabase
 * Realtime channel used by `SupabaseYjsProvider` (`board:<id>`) but on a
 * different broadcast event so the two protocols don't collide.
 *
 * We don't use the canonical y-protocols/awareness wire format because we're
 * not over a websocket – Supabase broadcast already handles framing for us,
 * and JSON keeps the payload introspectable in the dashboard.
 */
export class SupabaseAwareness {
  private channel: RealtimeChannel | null = null;
  private subscribed = false;
  private destroyed = false;

  private readonly states = new Map<number, AwarenessState>();
  private readonly listeners = new Set<ChangeListener>();
  private localState: AwarenessState | null = null;
  private localClock = 0;
  private readonly clientId: number;

  constructor(
    public readonly boardId: string,
    public readonly supabase: SupabaseClient,
    clientId?: number,
  ) {
    this.clientId =
      clientId ?? Math.floor(Math.random() * 0x7fffffff) + 1;
  }

  get id(): number {
    return this.clientId;
  }

  /** Attach to an existing channel and start listening. */
  attach(channel: RealtimeChannel) {
    this.channel = channel;
    channel.on(
      "broadcast",
      { event: "awareness" },
      ({ payload }: { payload: Payload }) => this.handle(payload),
    );
  }

  /** Called once the channel reports SUBSCRIBED. */
  onChannelReady() {
    if (this.destroyed) return;
    this.subscribed = true;
    // Ask peers for their current state, and broadcast ours if we have one.
    this.send({ type: "request", from: this.clientId });
    if (this.localState) {
      this.send({
        type: "update",
        clock: this.localClock,
        from: this.clientId,
        state: this.localState,
      });
    }
  }

  /** Called when the channel disconnects / before reconnect. */
  onChannelClosed() {
    this.subscribed = false;
  }

  setLocalState(partial: Partial<AwarenessState>) {
    if (this.destroyed) return;
    const prev =
      this.localState ??
      ({
        userId: "",
        name: "",
        color: "",
        cursor: null,
        selectedShapeIds: [],
      } satisfies AwarenessState);
    const next: AwarenessState = { ...prev, ...partial };
    this.localState = next;
    this.localClock += 1;
    this.applyLocal(next);
    this.send({
      type: "update",
      clock: this.localClock,
      from: this.clientId,
      state: next,
    });
  }

  getStates(): Map<number, AwarenessState> {
    return this.states;
  }

  on(event: "change", cb: ChangeListener) {
    if (event !== "change") return;
    this.listeners.add(cb);
  }

  off(event: "change", cb: ChangeListener) {
    if (event !== "change") return;
    this.listeners.delete(cb);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.subscribed) {
      try {
        this.send({ type: "leave", from: this.clientId });
      } catch {
        // best-effort
      }
    }
    this.listeners.clear();
    this.states.clear();
    this.channel = null;
    this.subscribed = false;
  }

  private send(payload: Payload) {
    if (!this.channel || !this.subscribed) return;
    void this.channel.send({
      type: "broadcast",
      event: "awareness",
      payload,
    });
  }

  private applyLocal(state: AwarenessState) {
    const prev = this.states.get(this.clientId);
    this.states.set(this.clientId, state);
    this.emit(prev ? { updated: [this.clientId] } : { added: [this.clientId] });
  }

  private handle(payload: Payload) {
    if (!payload || payload.from === this.clientId) return;

    if (payload.type === "request") {
      if (this.localState) {
        this.send({
          type: "update",
          clock: this.localClock,
          from: this.clientId,
          state: this.localState,
        });
      }
      return;
    }

    if (payload.type === "leave") {
      if (this.states.delete(payload.from)) {
        this.emit({ removed: [payload.from] });
      }
      return;
    }

    if (payload.type === "update") {
      const had = this.states.has(payload.from);
      this.states.set(payload.from, payload.state);
      this.emit(had ? { updated: [payload.from] } : { added: [payload.from] });
    }
  }

  private emit(
    changes: Partial<{ added: number[]; updated: number[]; removed: number[] }>,
  ) {
    const full = {
      added: changes.added ?? [],
      updated: changes.updated ?? [],
      removed: changes.removed ?? [],
    };
    for (const cb of this.listeners) {
      try {
        cb(this.states, full);
      } catch (err) {
        console.warn("[SupabaseAwareness] listener error", err);
      }
    }
  }
}
