"use client";

import { type AgentStatus } from "@/lib/voice/useVoiceAgent";

const LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Error",
};

const DOT: Record<AgentStatus, string> = {
  idle: "bg-zinc-400",
  connecting: "bg-amber-500 animate-pulse",
  listening: "bg-emerald-500 animate-pulse",
  thinking: "bg-violet-500 animate-pulse",
  speaking: "bg-sky-500 animate-pulse",
  error: "bg-red-500",
};

export function VoiceHUD({
  status,
  errorMessage,
  isConnected,
  mode,
  onToggleMode,
  onStart,
  onStop,
}: {
  status: AgentStatus;
  errorMessage: string | null;
  isConnected: boolean;
  mode: "ptt" | "open";
  onToggleMode: () => void;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[status]}`} />
          {LABEL[status]}
        </div>
        <button
          type="button"
          onClick={onToggleMode}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
          title="Toggle push-to-talk / always-on"
        >
          {mode === "ptt" ? "Push-to-talk" : "Always on"}
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={onStart}
            className="flex h-10 flex-1 items-center justify-center rounded-md bg-zinc-950 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Start talking
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            End conversation
          </button>
        )}
      </div>
    </div>
  );
}
