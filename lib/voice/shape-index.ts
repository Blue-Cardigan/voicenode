"use client";

import type { Editor, TLShape } from "tldraw";

export type ShapeKind = "note" | "rect" | "ellipse" | "arrow" | "text" | "other";

export interface ShapeMeta {
  id: string;
  kind: ShapeKind;
  text: string;
  color: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Selector {
  /** Match by partial id. */
  id?: string;
  /** Case-insensitive substring match on the shape's text. */
  textContains?: string;
  /** Tldraw colour name (e.g. "yellow", "red", "blue") or a hex. */
  color?: string;
  /** Restrict by kind. */
  kind?: ShapeKind;
}

function kindFromShape(s: TLShape): ShapeKind {
  switch (s.type) {
    case "note":
      return "note";
    case "geo": {
      const geo = (s.props as { geo?: string }).geo;
      if (geo === "ellipse") return "ellipse";
      if (geo === "rectangle") return "rect";
      return "rect";
    }
    case "arrow":
      return "arrow";
    case "text":
      return "text";
    default:
      return "other";
  }
}

function textFromShape(s: TLShape): string {
  const props = s.props as Record<string, unknown>;
  if (typeof props.text === "string") return props.text;
  if (
    typeof props.richText === "object" &&
    props.richText &&
    "content" in props.richText
  ) {
    try {
      // tldraw richText is a TipTap-like JSON tree; pull plain text recursively.
      const walk = (n: unknown): string => {
        if (!n || typeof n !== "object") return "";
        const node = n as { text?: string; content?: unknown[] };
        if (node.text) return node.text;
        if (Array.isArray(node.content)) return node.content.map(walk).join("");
        return "";
      };
      return walk(props.richText);
    } catch {
      return "";
    }
  }
  return "";
}

function colorFromShape(s: TLShape): string | null {
  const props = s.props as { color?: string };
  return typeof props.color === "string" ? props.color : null;
}

export function snapshotShapes(editor: Editor): ShapeMeta[] {
  const out: ShapeMeta[] = [];
  for (const shape of editor.getCurrentPageShapes()) {
    const bounds = editor.getShapePageBounds(shape.id);
    out.push({
      id: shape.id,
      kind: kindFromShape(shape),
      text: textFromShape(shape).slice(0, 200),
      color: colorFromShape(shape),
      x: bounds?.x ?? shape.x,
      y: bounds?.y ?? shape.y,
      w: bounds?.w ?? 0,
      h: bounds?.h ?? 0,
    });
  }
  return out;
}

export function matchShapes(shapes: ShapeMeta[], selector: Selector): ShapeMeta[] {
  const text = selector.textContains?.toLowerCase();
  const color = selector.color?.toLowerCase();
  return shapes.filter((s) => {
    if (selector.id && !s.id.includes(selector.id)) return false;
    if (selector.kind && s.kind !== selector.kind) return false;
    if (text && !s.text.toLowerCase().includes(text)) return false;
    if (color && (s.color ?? "").toLowerCase() !== color) return false;
    return true;
  });
}
