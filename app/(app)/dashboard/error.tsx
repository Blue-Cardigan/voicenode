"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        voicenode
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Couldn&apos;t load your boards
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Something went wrong while fetching boards. Try again in a moment.
        </p>
        {error.digest ? (
          <p className="font-mono text-[11px] text-zinc-400">
            error {error.digest}
          </p>
        ) : null}
      </div>
      <div>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
