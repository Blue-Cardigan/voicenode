// JSON-schema declarations for the client tools defined in `lib/voice/tools.ts`.
// Consumed by `scripts/sync-eleven-tools.ts` to register the tools with the
// ElevenLabs vibenode agent. Keep names in sync with `TOOL_NAMES` in tools.ts.
//
// Note: ElevenLabs requires every property (including nested ones inside
// object schemas) to carry a `description`. Don't drop them when extending.

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const SELECTOR = {
  type: "object",
  description:
    "A selector matching one shape on the board. Combine fields to disambiguate.",
  properties: {
    id: {
      type: "string",
      description: "Exact tldraw shape id. Rarely used; prefer textContains.",
    },
    textContains: {
      type: "string",
      description: "Case-insensitive substring match on the shape's text.",
    },
    color: {
      type: "string",
      description:
        "tldraw colour name: yellow, green, blue, red, orange, violet, light-red, black, grey, white.",
    },
    kind: {
      type: "string",
      description:
        "Restrict by shape kind. One of: note, rect, ellipse, arrow, text, other.",
      enum: ["note", "rect", "ellipse", "arrow", "text", "other"],
    },
  },
} as const;

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "createNote",
    description:
      "Add a sticky note to the board at the centre of the user's current view. Use this for brainstorming items.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Note text content (1–80 characters).",
        },
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
        kind: {
          type: "string",
          description: "Which geometric shape to create.",
          enum: ["rect", "ellipse", "arrow"],
        },
        text: {
          type: "string",
          description: "Optional label text inside the shape.",
        },
        color: {
          type: "string",
          description: "Optional tldraw colour name (defaults to yellow).",
        },
      },
      required: ["kind"],
    },
  },
  {
    name: "updateShape",
    description: "Change the text or colour of one shape on the board.",
    parameters: {
      type: "object",
      properties: {
        target: SELECTOR,
        text: {
          type: "string",
          description: "Replacement text for the shape.",
        },
        color: {
          type: "string",
          description: "Replacement tldraw colour name.",
        },
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
          description:
            "Either { direction: 'left'|'right'|'up'|'down' } or absolute { x, y } page coordinates.",
          properties: {
            x: {
              type: "number",
              description: "Absolute page x coordinate.",
            },
            y: {
              type: "number",
              description: "Absolute page y coordinate.",
            },
            direction: {
              type: "string",
              description:
                "Relative direction; moves about 30% of the viewport.",
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
    description: "Delete one shape from the board.",
    parameters: {
      type: "object",
      properties: { target: SELECTOR },
      required: ["target"],
    },
  },
  {
    name: "focusShape",
    description: "Pan and zoom the camera to one shape and select it.",
    parameters: {
      type: "object",
      properties: { target: SELECTOR },
      required: ["target"],
    },
  },
  {
    name: "listShapes",
    description:
      "Return a compact list of shapes on the board, optionally filtered. Use this to disambiguate before mutating.",
    parameters: {
      type: "object",
      properties: {
        filter: {
          ...SELECTOR,
          description:
            "Optional filter; omit to list everything on the board.",
        },
      },
    },
  },
  {
    name: "summarize",
    description:
      "Return a brief text summary of what is currently on the board. Use when the user asks 'what's on the board?'.",
    parameters: { type: "object", properties: {} },
  },
];
