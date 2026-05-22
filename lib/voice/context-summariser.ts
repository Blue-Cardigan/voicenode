"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "tldraw";
import { snapshotShapes, type ShapeMeta } from "./shape-index";

interface Diff {
  added: ShapeMeta[];
  removed: ShapeMeta[];
  moved: ShapeMeta[];
  edited: { prev: ShapeMeta; curr: ShapeMeta }[];
}

const MOVE_THRESHOLD = 8;

function diff(prev: ShapeMeta[], curr: ShapeMeta[]): Diff {
  const prevById = new Map(prev.map((s) => [s.id, s]));
  const currById = new Map(curr.map((s) => [s.id, s]));
  const added: ShapeMeta[] = [];
  const removed: ShapeMeta[] = [];
  const moved: ShapeMeta[] = [];
  const edited: { prev: ShapeMeta; curr: ShapeMeta }[] = [];
  for (const s of curr) {
    const p = prevById.get(s.id);
    if (!p) {
      added.push(s);
      continue;
    }
    if (p.text !== s.text) edited.push({ prev: p, curr: s });
    if (Math.abs(p.x - s.x) > MOVE_THRESHOLD || Math.abs(p.y - s.y) > MOVE_THRESHOLD) {
      moved.push(s);
    }
  }
  for (const p of prev) if (!currById.has(p.id)) removed.push(p);
  return { added, removed, moved, edited };
}

function label(s: ShapeMeta): string {
  const t = s.text.trim();
  if (t) return `"${t.slice(0, 24)}"`;
  return s.kind;
}

function groupSummary(shapes: ShapeMeta[], prefix: string): string | null {
  if (shapes.length === 0) return null;
  if (shapes.length === 1) {
    const s = shapes[0];
    const colour = s.color ? `${s.color} ` : "";
    return `${prefix}1 ${colour}${s.kind} ${label(s)}`.trim();
  }
  // group by kind+color
  const buckets = new Map<string, ShapeMeta[]>();
  for (const s of shapes) {
    const key = `${s.color ?? ""}|${s.kind}`;
    const arr = buckets.get(key) ?? [];
    arr.push(s);
    buckets.set(key, arr);
  }
  const parts: string[] = [];
  for (const [key, arr] of buckets) {
    const [color, kind] = key.split("|");
    const labels = arr
      .map((s) => s.text.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((t) => `"${t.slice(0, 24)}"`);
    const colour = color ? `${color} ` : "";
    const suffix = labels.length ? ` ${labels.join(", ")}` : "";
    parts.push(`${prefix}${arr.length} ${colour}${kind}s${suffix}`);
  }
  return parts.join("; ");
}

export function summariseDiff(prev: ShapeMeta[], curr: ShapeMeta[]): string | null {
  const d = diff(prev, curr);
  const parts: string[] = [];
  const added = groupSummary(d.added, "+");
  if (added) parts.push(added);
  const removed = groupSummary(d.removed, "-");
  if (removed) parts.push(removed);
  if (d.edited.length) {
    const ed = d.edited
      .slice(0, 3)
      .map(({ curr: c }) => label(c))
      .join(", ");
    parts.push(`edited ${ed}${d.edited.length > 3 ? ` (+${d.edited.length - 3})` : ""}`);
  }
  if (d.moved.length) {
    const mv = d.moved
      .slice(0, 3)
      .map((s) => label(s))
      .join(", ");
    parts.push(`${mv} moved${d.moved.length > 3 ? ` (+${d.moved.length - 3})` : ""}`);
  }
  if (parts.length === 0) return null;
  return `Board update: ${parts.join("; ")}.`;
}

const DEBOUNCE_MS = 1000;
const MIN_INTERVAL_MS = 8000;

export function useBoardContextUpdates(
  editor: Editor | null,
  send: (text: string) => void,
) {
  const lastSnapshotRef = useRef<ShapeMeta[]>([]);
  const lastSentAtRef = useRef<number>(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    if (!editor) return;
    lastSnapshotRef.current = snapshotShapes(editor);

    const flush = () => {
      pendingTimerRef.current = null;
      const now = Date.now();
      const sinceLast = now - lastSentAtRef.current;
      if (sinceLast < MIN_INTERVAL_MS) {
        const wait = MIN_INTERVAL_MS - sinceLast;
        pendingTimerRef.current = setTimeout(flush, wait);
        return;
      }
      const curr = snapshotShapes(editor);
      const summary = summariseDiff(lastSnapshotRef.current, curr);
      lastSnapshotRef.current = curr;
      if (summary) {
        lastSentAtRef.current = now;
        try {
          sendRef.current(summary);
        } catch {
          // ignore
        }
      }
    };

    const schedule = () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(flush, DEBOUNCE_MS);
    };

    const unlisten = editor.store.listen(
      () => {
        schedule();
      },
      { source: "user", scope: "document" },
    );

    return () => {
      unlisten();
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [editor]);
}
