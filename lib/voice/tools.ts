"use client";

import type { Editor, TLShapeId } from "tldraw";
import { createShapeId } from "tldraw";
import {
  matchShapes,
  snapshotShapes,
  type Selector,
  type ShapeMeta,
} from "./shape-index";

export interface ToolContext {
  editor: Editor;
}

type ToolResult =
  | { status: "ok"; message: string; ids?: string[] }
  | { status: "ambiguous"; message: string; candidates: ShapeMeta[] }
  | { status: "error"; message: string };


function asRichText(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  } as unknown;
}

function ok(message: string, ids?: string[]): ToolResult {
  return { status: "ok", message, ids };
}

function err(message: string): ToolResult {
  return { status: "error", message };
}

function resolveOne(editor: Editor, sel: Selector): ToolResult | TLShapeId {
  const all = snapshotShapes(editor);
  const matches = matchShapes(all, sel);
  if (matches.length === 0) return err("No matching shape found.");
  if (matches.length > 1) {
    return {
      status: "ambiguous",
      message: `Multiple matches (${matches.length}); be more specific.`,
      candidates: matches.slice(0, 6),
    };
  }
  return matches[0].id as TLShapeId;
}

function resolveMany(editor: Editor, sel: Selector | undefined): ShapeMeta[] {
  const all = snapshotShapes(editor);
  return sel ? matchShapes(all, sel) : all;
}

function viewportCenter(editor: Editor) {
  const vp = editor.getViewportPageBounds();
  return { x: vp.midX, y: vp.midY };
}

const COLOR_ALIASES: Record<string, string> = {
  yellow: "yellow",
  green: "green",
  blue: "blue",
  red: "red",
  orange: "orange",
  violet: "violet",
  purple: "violet",
  black: "black",
  grey: "grey",
  gray: "grey",
  white: "white",
  pink: "light-red",
};

function normalizeColor(c?: string): string {
  if (!c) return "yellow";
  return COLOR_ALIASES[c.toLowerCase()] ?? c.toLowerCase();
}

export const TOOL_NAMES = [
  "createNote",
  "createShape",
  "updateShape",
  "moveShape",
  "deleteShape",
  "focusShape",
  "listShapes",
  "summarize",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type ClientToolsApi = Record<ToolName, (args: Record<string, unknown>) => unknown> & {
  /**
   * Coalesces a burst of agent tool calls within a single conversational turn
   * into one history entry. Call from the voice agent's onMessage handler when
   * the source transitions from user -> agent (i.e. a new turn started).
   * The next tool call will lay down a history stopping point; subsequent
   * calls in the same turn skip it so a single Cmd-Z reverts the whole turn.
   */
  markTurnBoundary: () => void;
};

export function buildClientTools(ctx: ToolContext): ClientToolsApi {
  const editor = ctx.editor;

  // Tracks whether the current conversational turn has already laid down a
  // history stopping point. Reset by markTurnBoundary() so the next tool call
  // in the new turn (and only it) emits a fresh stopping point.
  let turnMarked = false;

  // Agent-driven mutations are wrapped in store.mergeRemoteChanges so they
  // surface as source: "remote" to listeners. The board-awareness summariser
  // filters to source: "user", so without this the SDK would echo its own
  // edits back to itself.
  function withHistoryMark<T>(fn: () => T): T {
    if (!turnMarked) {
      editor.markHistoryStoppingPoint("voice-turn");
      turnMarked = true;
    }
    let result!: T;
    editor.store.mergeRemoteChanges(() => {
      result = fn();
    });
    return result;
  }

  function markTurnBoundary() {
    turnMarked = false;
  }

  return {
    createNote: (args) => {
      const text = String(args.text ?? "").trim();
      if (!text) return err("text is required.");
      const color = normalizeColor(args.color as string | undefined);
      const center = viewportCenter(editor);
      const id = createShapeId();
      withHistoryMark(() => {
        editor.createShape({
          id,
          type: "note",
          x: center.x - 100,
          y: center.y - 100,
          props: { richText: asRichText(text), color },
        } as never);
      });
      return ok(`Added a ${color} note: "${text}"`, [id]);
    },

    createShape: (args) => {
      const kind = String(args.kind ?? "rect").toLowerCase();
      const text = String(args.text ?? "").trim();
      const color = normalizeColor(args.color as string | undefined);
      const center = viewportCenter(editor);
      const id = createShapeId();
      withHistoryMark(() => {
        if (kind === "arrow") {
          editor.createShape({
            id,
            type: "arrow",
            x: center.x - 100,
            y: center.y,
            props: {
              color,
              start: { x: 0, y: 0 },
              end: { x: 200, y: 0 },
              richText: asRichText(text),
            },
          } as never);
        } else {
          editor.createShape({
            id,
            type: "geo",
            x: center.x - 75,
            y: center.y - 50,
            props: {
              geo: kind === "ellipse" ? "ellipse" : "rectangle",
              color,
              richText: asRichText(text),
              w: 150,
              h: 100,
            },
          } as never);
        }
      });
      return ok(`Created a ${color} ${kind}${text ? `: "${text}"` : ""}`, [id]);
    },

    updateShape: (args) => {
      const selector = (args.target ?? {}) as Selector;
      const resolved = resolveOne(editor, selector);
      if (typeof resolved !== "string") return resolved;
      const patch: Record<string, unknown> = {};
      if (typeof args.text === "string") patch.richText = asRichText(args.text);
      if (typeof args.color === "string") patch.color = normalizeColor(args.color);
      if (Object.keys(patch).length === 0) return err("Nothing to update.");
      const shape = editor.getShape(resolved as TLShapeId);
      if (!shape) return err("Shape vanished.");
      withHistoryMark(() => {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          props: { ...(shape.props as object), ...patch },
        } as never);
      });
      return ok(`Updated ${shape.id}.`, [shape.id]);
    },

    moveShape: (args) => {
      const selector = (args.target ?? {}) as Selector;
      const resolved = resolveOne(editor, selector);
      if (typeof resolved !== "string") return resolved;
      const shape = editor.getShape(resolved as TLShapeId);
      if (!shape) return err("Shape vanished.");
      const vp = editor.getViewportPageBounds();
      const to = args.to as { x?: number; y?: number; direction?: string } | undefined;
      let dx = 0;
      let dy = 0;
      if (to && typeof to === "object") {
        if (typeof to.x === "number" || typeof to.y === "number") {
          dx = (to.x ?? shape.x) - shape.x;
          dy = (to.y ?? shape.y) - shape.y;
        } else if (typeof to.direction === "string") {
          const step = Math.min(vp.w, vp.h) * 0.3;
          switch (to.direction) {
            case "right":
              dx = step;
              break;
            case "left":
              dx = -step;
              break;
            case "up":
              dy = -step;
              break;
            case "down":
              dy = step;
              break;
          }
        }
      }
      withHistoryMark(() => {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          x: shape.x + dx,
          y: shape.y + dy,
        } as never);
      });
      return ok(`Moved ${shape.id} by (${Math.round(dx)}, ${Math.round(dy)}).`, [shape.id]);
    },

    deleteShape: (args) => {
      const selector = (args.target ?? {}) as Selector;
      const resolved = resolveOne(editor, selector);
      if (typeof resolved !== "string") return resolved;
      withHistoryMark(() => editor.deleteShape(resolved as TLShapeId));
      return ok(`Deleted ${resolved}.`, [resolved]);
    },

    focusShape: (args) => {
      const selector = (args.target ?? {}) as Selector;
      const resolved = resolveOne(editor, selector);
      if (typeof resolved !== "string") return resolved;
      const bounds = editor.getShapePageBounds(resolved as TLShapeId);
      if (!bounds) return err("Shape has no geometry yet — try again in a moment.");
      editor.zoomToBounds(bounds, {
        targetZoom: 1.4,
        animation: { duration: 300 },
      });
      editor.select(resolved as TLShapeId);
      return ok(`Focused ${resolved}.`, [resolved]);
    },

    listShapes: (args) => {
      const matches = resolveMany(editor, (args.filter ?? undefined) as Selector | undefined);
      return {
        status: "ok",
        message: `${matches.length} shape${matches.length === 1 ? "" : "s"}.`,
        shapes: matches.slice(0, 40),
      };
    },

    summarize: () => {
      const shapes = snapshotShapes(editor);
      const byKind: Record<string, number> = {};
      const sampleTexts: string[] = [];
      for (const s of shapes) {
        byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
        if (s.text && sampleTexts.length < 8) sampleTexts.push(s.text);
      }
      const breakdown =
        Object.entries(byKind)
          .map(([k, n]) => `${n} ${k}${n === 1 ? "" : "s"}`)
          .join(", ") || "nothing";
      return ok(
        `Board has ${breakdown}.${sampleTexts.length ? ` Sample: ${sampleTexts.join("; ")}.` : ""}`,
      );
    },

    markTurnBoundary,
  };
}
