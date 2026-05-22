"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import type { Editor } from "tldraw";
import * as Y from "yjs";
import "tldraw/tldraw.css";

import { createClient } from "@/lib/supabase/client";
import {
  type AwarenessState,
  SupabaseYjsProvider,
  attachSnapshotWriter,
  attachYjsBinding,
  loadSnapshot,
} from "@/lib/yjs";

const Tldraw = dynamic(
  () => import("tldraw").then((m) => ({ default: m.Tldraw })),
  { ssr: false, loading: () => <CanvasFallback /> },
);

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950">
      Loading canvas…
    </div>
  );
}

export type BoardProps = {
  boardId: string;
  /** Stable per-tab user id (used as the key for presence records). */
  userId: string;
  userName: string;
  userColor: string;
  onMount?: (editor: Editor) => void;
};

const CURSOR_THROTTLE_MS = 50; // 20 Hz feels smooth without flooding broadcast

export function Board({
  boardId,
  userId,
  userName,
  userColor,
  onMount,
}: BoardProps) {
  const supabase = useMemo(() => createClient(), []);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [boardId]);

  return (
    <div className="absolute inset-0">
      <Tldraw
        key={boardId}
        onMount={(editor) => {
          const ydoc = new Y.Doc();
          let disposed = false;
          const teardowns: Array<() => void> = [];

          // Reflect local user info into tldraw — drives the user's own name
          // tag, default shape color, etc.
          editor.user.updateUserPreferences({
            id: userId,
            name: userName,
            color: userColor,
          });

          (async () => {
            const snapshot = await loadSnapshot(boardId, supabase);
            if (disposed) return;
            if (snapshot) {
              try {
                Y.applyUpdate(ydoc, snapshot);
              } catch {
                // ignore corrupt snapshot
              }
            }
            if (disposed) return;

            teardowns.push(attachYjsBinding(editor, ydoc));
            const provider = new SupabaseYjsProvider(boardId, ydoc, supabase);
            teardowns.push(() => provider.destroy());
            teardowns.push(attachSnapshotWriter(boardId, ydoc, supabase));

            // --- Awareness wiring: local → broadcast ---
            const awareness = provider.awareness;
            if (awareness) {
              const pushLocal = (
                partial: Partial<AwarenessState> = {},
              ) => {
                const point = editor.inputs.getCurrentPagePoint();
                const selected = editor
                  .getSelectedShapeIds()
                  .map((id) => id as string);
                awareness.setLocalState({
                  userId,
                  name: userName,
                  color: userColor,
                  cursor: { x: point.x, y: point.y },
                  selectedShapeIds: selected,
                  ...partial,
                });
              };

              // Pointer movement → throttled cursor broadcast.
              let lastSent = 0;
              let pending: ReturnType<typeof setTimeout> | null = null;
              const onPointer = () => {
                const now = Date.now();
                const wait = Math.max(0, CURSOR_THROTTLE_MS - (now - lastSent));
                if (wait === 0) {
                  lastSent = now;
                  pushLocal();
                  return;
                }
                if (pending) return;
                pending = setTimeout(() => {
                  pending = null;
                  lastSent = Date.now();
                  pushLocal();
                }, wait);
              };

              const removePointerListener = editor.store.listen(
                () => onPointer(),
                { source: "user", scope: "session" },
              );
              teardowns.push(removePointerListener);
              teardowns.push(() => {
                if (pending) clearTimeout(pending);
              });

              // Selection changes → immediate broadcast.
              let lastSelection = "";
              const removeSelectionListener = editor.store.listen(
                () => {
                  const sel = editor.getSelectedShapeIds().join(",");
                  if (sel === lastSelection) return;
                  lastSelection = sel;
                  pushLocal();
                },
                { source: "user", scope: "session" },
              );
              teardowns.push(removeSelectionListener);

              // Seed initial state so peers see us immediately.
              pushLocal();

              // --- Awareness wiring: remote → tldraw presence records ---
              const presenceIdFor = (uid: string) =>
                `instance_presence:${uid}` as const;
              const currentPresenceIds = new Set<string>();

              const syncRemote = (states: Map<number, AwarenessState>) => {
                const currentPageId = editor.getCurrentPageId();
                const records: unknown[] = [];
                const nextIds = new Set<string>();
                const now = Date.now();
                for (const [clientId, s] of states) {
                  if (s.userId === userId) continue; // skip self
                  const recId = presenceIdFor(s.userId);
                  nextIds.add(recId);
                  records.push({
                    id: recId,
                    typeName: "instance_presence",
                    userId: s.userId,
                    userName: s.name,
                    color: s.color,
                    camera: { x: 0, y: 0, z: 1 },
                    selectedShapeIds: s.selectedShapeIds,
                    currentPageId,
                    brush: null,
                    scribbles: [],
                    screenBounds: { x: 0, y: 0, w: 1, h: 1 },
                    followingUserId: null,
                    cursor: s.cursor
                      ? {
                          x: s.cursor.x,
                          y: s.cursor.y,
                          type: "default",
                          rotation: 0,
                        }
                      : null,
                    chatMessage: "",
                    meta: { clientId },
                    lastActivityTimestamp: now,
                  });
                }

                const toRemove: string[] = [];
                for (const id of currentPresenceIds) {
                  if (!nextIds.has(id)) toRemove.push(id);
                }
                currentPresenceIds.clear();
                for (const id of nextIds) currentPresenceIds.add(id);

                editor.store.mergeRemoteChanges(() => {
                  if (records.length) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    editor.store.put(records as any);
                  }
                  if (toRemove.length) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    editor.store.remove(toRemove as any);
                  }
                });
              };

              awareness.on("change", syncRemote);
              teardowns.push(() => {
                awareness.off("change", syncRemote);
                if (currentPresenceIds.size) {
                  const ids = Array.from(currentPresenceIds);
                  editor.store.mergeRemoteChanges(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    editor.store.remove(ids as any);
                  });
                  currentPresenceIds.clear();
                }
              });
            }
          })();

          onMount?.(editor);

          cleanupRef.current = () => {
            disposed = true;
            while (teardowns.length) {
              try {
                teardowns.pop()?.();
              } catch {
                // ignore
              }
            }
            ydoc.destroy();
          };
        }}
      />
    </div>
  );
}
