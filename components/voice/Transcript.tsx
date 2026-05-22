"use client";

import type { TranscriptEntry } from "@/lib/voice/useVoiceAgent";
import { useEffect, useMemo, useRef, useState } from "react";

function formatRelative(now: number, at: number): string {
  const diff = Math.max(0, Math.floor((now - at) / 1000));
  if (diff < 3) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

type Group = {
  role: TranscriptEntry["role"];
  startAt: number;
  entries: TranscriptEntry[];
};

function groupEntries(entries: TranscriptEntry[]): Group[] {
  const groups: Group[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.role === e.role) {
      last.entries.push(e);
    } else {
      groups.push({ role: e.role, startAt: e.at, entries: [e] });
    }
  }
  return groups;
}

export function Transcript({ entries }: { entries: TranscriptEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  // Tick once per second so relative timestamps stay fresh.
  useEffect(() => {
    if (entries.length === 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [entries.length]);

  const groups = useMemo(() => groupEntries(entries), [entries]);

  async function copyAll() {
    const text = entries
      .map((e) => `${e.role === "user" ? "You" : "vibenode"}: ${e.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be blocked
    }
  }

  if (entries.length === 0) {
    return (
      <div
        className="flex h-48 w-full max-w-md items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-800"
        aria-live="polite"
      >
        Transcript appears here once the conversation starts.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Transcript
        </span>
        <button
          type="button"
          onClick={copyAll}
          aria-label="Copy transcript to clipboard"
          className="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        ref={ref}
        aria-live="polite"
        aria-label="Conversation transcript"
        className="flex h-72 w-full flex-col gap-3 overflow-y-auto rounded-xl border border-zinc-200 bg-white/80 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
      >
        {groups.map((g, gi) => {
          const isUser = g.role === "user";
          const initial = isUser ? "Y" : "v";
          const name = isUser ? "You" : "vibenode";
          return (
            <div
              key={`${gi}-${g.startAt}`}
              className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold ${
                  isUser
                    ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                }`}
              >
                {initial}
              </div>
              <div
                className={`flex min-w-0 flex-1 flex-col gap-1 ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex items-baseline gap-1.5 text-[10px] ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <span className="font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <span className="sr-only">{name} said </span>
                    <span aria-hidden="true">{name}</span>
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    {formatRelative(now, g.startAt)}
                  </span>
                </div>
                {g.entries.map((e) => (
                  <div
                    key={e.id}
                    className={`max-w-[85%] rounded-md px-3 py-2 text-sm leading-snug ${
                      isUser
                        ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {e.text}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
