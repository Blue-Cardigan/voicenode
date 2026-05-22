"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import type { Editor } from "tldraw";
import * as Y from "yjs";
import "tldraw/tldraw.css";

import { createClient } from "@/lib/supabase/client";
import {
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
  onMount?: (editor: Editor) => void;
};

export function Board({ boardId, onMount }: BoardProps) {
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
        onMount={(editor) => {
          const ydoc = new Y.Doc();
          let disposed = false;
          const teardowns: Array<() => void> = [];

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
