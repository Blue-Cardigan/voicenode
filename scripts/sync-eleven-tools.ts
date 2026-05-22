/**
 * Registers (or refreshes) the vibenode agent's client tools on ElevenLabs.
 *
 * Run with:
 *   pnpm sync-eleven-tools
 *
 * Reads ELEVENLABS_API_KEY and either ELEVENLABS_AGENT_ID or
 * NEXT_PUBLIC_ELEVENLABS_AGENT_ID from the environment.
 *
 * What it does:
 *   1. Lists existing workspace tools, finds any with matching names.
 *   2. For each declaration in `lib/voice/tool-spec.ts`:
 *      - if a tool with that name exists → PATCH it
 *      - else → POST a new one
 *   3. PATCHes the agent so `conversation_config.agent.prompt.tool_ids`
 *      contains all eight ids.
 *
 * Safe to re-run. Tools not declared here are left untouched.
 */

import dotenv from "dotenv";
import { TOOL_DECLARATIONS, type ToolDeclaration } from "../lib/voice/tool-spec";

// Next.js convention: load .env.local first (machine-specific overrides),
// then fall back to .env (committed defaults).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const API_BASE = "https://api.elevenlabs.io/v1";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID =
  process.env.ELEVENLABS_AGENT_ID ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY is required.");
  process.exit(1);
}
if (!AGENT_ID) {
  console.error(
    "ELEVENLABS_AGENT_ID or NEXT_PUBLIC_ELEVENLABS_AGENT_ID is required.",
  );
  process.exit(1);
}

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "xi-api-key": API_KEY!,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}\n${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

interface ExistingTool {
  id: string;
  tool_config: { type: string; name: string };
}

interface ToolsListResponse {
  tools: ExistingTool[];
}

function bodyFor(decl: ToolDeclaration) {
  return {
    tool_config: {
      type: "client",
      name: decl.name,
      description: decl.description,
      parameters: decl.parameters,
      expects_response: true,
      response_timeout_secs: 10,
    },
  };
}

async function main() {
  console.log(`Syncing ${TOOL_DECLARATIONS.length} tools to agent ${AGENT_ID}…`);

  const list = await api<ToolsListResponse>("GET", "/convai/tools");
  const byName = new Map<string, ExistingTool>();
  for (const t of list.tools ?? []) {
    if (t.tool_config?.type === "client") byName.set(t.tool_config.name, t);
  }

  const toolIds: string[] = [];

  for (const decl of TOOL_DECLARATIONS) {
    const existing = byName.get(decl.name);
    if (existing) {
      await api("PATCH", `/convai/tools/${existing.id}`, bodyFor(decl));
      console.log(`  ✓ updated ${decl.name} (${existing.id})`);
      toolIds.push(existing.id);
    } else {
      const created = await api<{ id: string }>(
        "POST",
        "/convai/tools",
        bodyFor(decl),
      );
      console.log(`  + created ${decl.name} (${created.id})`);
      toolIds.push(created.id);
    }
  }

  console.log(`\nAttaching ${toolIds.length} tools to agent…`);

  // Fetch the agent to merge with any existing tool_ids the user added manually.
  const agent = await api<{
    conversation_config?: {
      agent?: { prompt?: { tool_ids?: string[] } };
    };
  }>("GET", `/convai/agents/${AGENT_ID}`);

  const existingIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const mergedIds = Array.from(new Set([...existingIds, ...toolIds]));

  await api("PATCH", `/convai/agents/${AGENT_ID}`, {
    conversation_config: {
      agent: { prompt: { tool_ids: mergedIds } },
    },
  });

  console.log(`✓ agent now has ${mergedIds.length} tool_ids attached.`);
  console.log("\nDone. Reload your board and start talking.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
