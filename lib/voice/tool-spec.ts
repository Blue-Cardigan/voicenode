// JSON-schema declarations for the client tools defined in `lib/voice/tools.ts`.
// Consumed by `scripts/sync-eleven-tools.ts` to register the tools with the
// ElevenLabs vibenode agent. Keep names in sync with `TOOL_NAMES` in tools.ts.

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const SELECTOR: Record<string, unknown> = {
  type: "object",
  description:
    "A selector matching one shape on the board. Combine fields to disambiguate.",
  properties: {
    id: { type: "string", description: "Exact tldraw shape id (rare)." },
    textContains: {
      type: "string",
      description: "Case-insensitive substring match on the shape's text.",
    },
    color: {
      type: "string",
      description: "tldraw colour name: yellow, green, blue, red, orange, violet, light-red, black, grey, white.",
    },
    kind: {
      type: "string",
      enum: ["note", "rect", "ellipse", "arrow", "text", "other"],
    },
  },
};

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "createNote",
    description:
      "Add a sticky note to the board at the centre of the user's current view. Use this for brainstorming items.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Note text (1–80 chars)." },
        color: {
          type: "string",
          description:
            "Optional tldraw colour name (defaults to yellow): yellow, green, blue, red, orange, violet, light-red, black, grey.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "createShape",
    description:
      "Create a rectangle, ellipse, or arrow shape on the board. Prefer createNote for plain ideas.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["rect", "ellipse", "arrow"] },
        text: { type: "string" },
        color: { type: "string" },
      },
      required: ["kind"],
    },
  },
  {
    name: "updateShape",
    description: "Change the text or colour of one shape.",
    parameters: {
      type: "object",
      properties: {
        target: SELECTOR,
        text: { type: "string" },
        color: { type: "string" },
      },
      required: ["target"],
    },
  },
  {
    name: "moveShape",
    description:
      "Move one shape by direction (left/right/up/down ~30% of viewport) or to absolute page coordinates.",
    parameters: {
      type: "object",
      properties: {
        target: SELECTOR,
        to: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            direction: {
              type: "string",
              enum: ["left", "right", "up", "down"],
            },
          },
        },
      },
      required: ["target", "to"],
    },
  },
  {
    name: "deleteShape",
    description: "Delete one shape.",
    parameters: {
      type: "object",
      properties: { target: SELECTOR },
      required: ["target"],
    },
  },
  {
    name: "focusShape",
    description: "Pan and zoom to one shape and select it.",
    parameters: {
      type: "object",
      properties: { target: SELECTOR },
      required: ["target"],
    },
  },
  {
    name: "listShapes",
    description:
      "Return a compact list of shapes on the board, optionally filtered. Use to disambiguate before mutating.",
    parameters: {
      type: "object",
      properties: { filter: SELECTOR },
    },
  },
  {
    name: "summarize",
    description:
      "Return a brief text summary of what is currently on the board. Use when the user asks 'what's on the board?'.",
    parameters: { type: "object", properties: {} },
  },
];
