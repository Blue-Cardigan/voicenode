"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "tldraw";
import Link from "next/link";
import { Board } from "@/components/canvas/Board";
import { VoiceHUD } from "@/components/voice/VoiceHUD";
import { Transcript } from "@/components/voice/Transcript";
import { useVoiceAgent, type ClientTools } from "@/lib/voice/useVoiceAgent";
import { buildClientTools } from "@/lib/voice/tools";
import { useBoardContextUpdates } from "@/lib/voice/context-summariser";
import { track } from "@/lib/analytics";

const ADJECTIVES = [
  "Brisk",
  "Calm",
  "Daring",
  "Eager",
  "Fancy",
  "Gentle",
  "Happy",
  "Jolly",
  "Keen",
  "Lively",
  "Mellow",
  "Nimble",
  "Plucky",
  "Quick",
  "Rapid",
  "Sunny",
  "Tidy",
  "Witty",
  "Zesty",
];
const ANIMALS = [
  "Otter",
  "Owl",
  "Fox",
  "Wolf",
  "Hawk",
  "Lynx",
  "Bear",
  "Crane",
  "Heron",
  "Moth",
  "Newt",
  "Pika",
  "Quail",
  "Raven",
  "Stoat",
  "Tern",
  "Vole",
  "Wren",
];

type AnonUser = { id: string; name: string; color: string };

const STORAGE_KEY = "voicenode:anon-user";

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randomUser(): AnonUser {
  const rng = Math.random;
  const adj = pick(ADJECTIVES, rng);
  const animal = pick(ANIMALS, rng);
  const num = Math.floor(rng() * 99) + 1;
  // High-saturation, fixed lightness HSL → good contrast on light & dark.
  const hue = Math.floor(rng() * 360);
  const color = `hsl(${hue} 70% 50%)`;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${adj}-${animal}-${num}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name: `${adj} ${animal} ${num}`, color };
}

function loadOrCreateAnonUser(): AnonUser {
  if (typeof window === "undefined") {
    // Server render – will be replaced on hydration. Use stable placeholder.
    return { id: "anon", name: "Anonymous", color: "hsl(220 70% 50%)" };
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AnonUser>;
      if (parsed.id && parsed.name && parsed.color) {
        return parsed as AnonUser;
      }
    }
  } catch {
    // ignore quota / parse errors
  }
  const fresh = randomUser();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
}

export function BoardShell({ id }: { id: string }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  // Re-evaluate on mount so we read sessionStorage on the client. Server
  // render returns the placeholder; client render swaps in the stable user.
  const [anonUser, setAnonUser] = useState<AnonUser>(() =>
    loadOrCreateAnonUser(),
  );
  useEffect(() => {
    // SSR returns a placeholder so markup matches on hydration; swap in the
    // real (sessionStorage-backed) anon user on the client after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonUser(loadOrCreateAnonUser());
  }, []);

  useEffect(() => {
    track("board_opened", { boardId: id });
  }, [id]);

  const clientTools = useMemo<ClientTools>(() => {
    if (!editor) return {};
    return buildClientTools({ editor }) as unknown as ClientTools;
  }, [editor]);

  const v = useVoiceAgent({ clientTools });

  useBoardContextUpdates(editor, v.sendContextualUpdate);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Board
        boardId={id}
        userId={anonUser.id}
        userName={anonUser.name}
        userColor={anonUser.color}
        onMount={setEditor}
      />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="pointer-events-auto rounded-md border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-300 dark:hover:bg-zinc-950"
        >
          ← Boards
        </Link>
        <div className="pointer-events-auto rounded-md border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          Board <span className="font-mono">{id.slice(0, 8)}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-3 px-4">
        <div className="pointer-events-auto w-full">
          <VoiceHUD
            status={v.status}
            errorMessage={v.errorMessage}
            isConnected={v.isConnected}
            mode={v.mode}
            onToggleMode={() => v.setMode(v.mode === "ptt" ? "open" : "ptt")}
            onStart={v.start}
            onStop={v.stop}
          />
        </div>
        {transcriptOpen && (
          <div className="pointer-events-auto w-full">
            <Transcript entries={v.transcript} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setTranscriptOpen((o) => !o)}
          className="pointer-events-auto rounded-md border border-zinc-200 bg-white/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-500"
        >
          {transcriptOpen ? "Hide transcript" : "Show transcript"}
        </button>
      </div>
    </div>
  );
}
