"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "tldraw";
import Link from "next/link";
import { ConversationProvider } from "@elevenlabs/react";
import { Board } from "@/components/canvas/Board";
import { VoiceHUD } from "@/components/voice/VoiceHUD";
import { Transcript } from "@/components/voice/Transcript";
import { useVoiceAgent, type ClientTools } from "@/lib/voice/useVoiceAgent";
import { buildClientTools } from "@/lib/voice/tools";
import { useBoardContextUpdates } from "@/lib/voice/context-summariser";
import { track } from "@/lib/analytics";

export function BoardShell({ id }: { id: string }) {
  return (
    <ConversationProvider>
      <BoardShellInner id={id} />
    </ConversationProvider>
  );
}

function BoardShellInner({ id }: { id: string }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

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
      <Board boardId={id} onMount={setEditor} />

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
