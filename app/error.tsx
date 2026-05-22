"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 text-center dark:bg-zinc-950">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        voicenode
      </div>
      <div className="flex max-w-md flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Something went wrong
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          An unexpected error occurred. Try again, or head back to your boards.
        </p>
        {error.digest ? (
          <p className="font-mono text-[11px] text-zinc-400">
            error {error.digest}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Try again
      </button>
    </main>
  );
}
