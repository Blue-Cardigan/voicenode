"use client";

import { type AgentStatus } from "@/lib/voice/useVoiceAgent";
import { useEffect, useState } from "react";
import { MicDevicePicker } from "./MicDevicePicker";

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

/**
 * Decorative four-bar audio meter. NOT a real meter — we intentionally do not
 * tap into an AnalyserNode here; bars animate via CSS keyframes whenever the
 * agent is listening or speaking. Gives the HUD a sense of life without the
 * complexity of wiring through to the underlying MediaStream.
 */
function AudioMeter({ active, tone }: { active: boolean; tone: "listening" | "speaking" }) {
  const colour =
    tone === "listening"
      ? "bg-emerald-500 dark:bg-emerald-400"
      : "bg-sky-500 dark:bg-sky-400";
  return (
    <div
      aria-hidden="true"
      className="flex h-4 items-end gap-0.5"
      style={{ width: 22 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-sm ${colour} transition-opacity ${
            active ? "opacity-100" : "opacity-30"
          }`}
          style={{
            height: active ? undefined : "25%",
            animation: active
              ? `voicenode-meter 900ms ease-in-out ${i * 110}ms infinite`
              : undefined,
          }}
        />
      ))}
      <style>{`
        @keyframes voicenode-meter {
          0%, 100% { height: 25%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
}

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
  // Error-toast: auto-dismiss after 5s. Re-arms whenever errorMessage changes.
  // We track the "currently dismissed" error string; when the upstream error
  // changes to something new, the comparison naturally re-shows the toast
  // without needing a reset effect (React 19 set-state-in-effect rule).
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  useEffect(() => {
    if (!errorMessage || errorMessage === dismissedError) return;
    const id = window.setTimeout(() => setDismissedError(errorMessage), 5000);
    return () => window.clearTimeout(id);
  }, [errorMessage, dismissedError]);

  const showError = !!errorMessage && errorMessage !== dismissedError;
  const isListening = status === "listening";
  const isSpeaking = status === "speaking";
  const showMeter = isListening || isSpeaking;

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span
            className={`h-2.5 w-2.5 rounded-full ${DOT[status]}`}
            aria-hidden="true"
          />
          <span aria-live="polite">{LABEL[status]}</span>
          {showMeter ? (
            <AudioMeter active tone={isSpeaking ? "speaking" : "listening"} />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <MicDevicePicker disabled={isConnected} />
          <button
            type="button"
            onClick={onToggleMode}
            aria-label={`Voice input mode: ${mode === "ptt" ? "push-to-talk" : "always on"}. Click to toggle.`}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            title="Toggle push-to-talk / always-on"
          >
            {mode === "ptt" ? "Push-to-talk" : "Always on"}
          </button>
        </div>
      </div>

      {/* Keyboard hint row — only when relevant */}
      {isConnected && mode === "ptt" && (isListening || status === "idle") ? (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          Hold
          <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Space
          </kbd>
          to talk
        </div>
      ) : null}
      {isConnected && isSpeaking ? (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          Tap
          <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Space
          </kbd>
          to interrupt
        </div>
      ) : null}

      {showError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-900 transition-opacity dark:bg-red-950/40 dark:text-red-200"
        >
          <span className="flex-1 leading-snug">{errorMessage}</span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDismissedError(errorMessage);
                onStart();
              }}
              className="rounded-md border border-red-300/60 px-1.5 py-0.5 text-[11px] font-medium text-red-900 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:border-red-800/60 dark:text-red-200 dark:hover:bg-red-900/40"
            >
              Retry
            </button>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setDismissedError(errorMessage)}
              className="rounded-md p-0.5 text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={onStart}
            aria-label="Start voice conversation"
            className="flex h-10 flex-1 items-center justify-center rounded-md bg-zinc-950 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Start talking
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            aria-label="End voice conversation"
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            End conversation
          </button>
        )}
      </div>
    </div>
  );
}
