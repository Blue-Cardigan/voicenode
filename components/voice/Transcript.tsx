"use client";

import type { TranscriptEntry } from "@/lib/voice/useVoiceAgent";
import { useEffect, useRef } from "react";

export function Transcript({ entries }: { entries: TranscriptEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex h-48 w-full max-w-md items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-800">
        Transcript appears here once the conversation starts.
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex h-72 w-full max-w-md flex-col gap-2 overflow-y-auto rounded-xl border border-zinc-200 bg-white/80 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
    >
      {entries.map((e) => (
        <div
          key={e.id}
          className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm ${
            e.role === "user"
              ? "self-end bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
              : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider opacity-60">
            {e.role === "user" ? "You" : "vibenode"}
          </span>
          <span className="leading-snug">{e.text}</span>
        </div>
      ))}
    </div>
  );
}
