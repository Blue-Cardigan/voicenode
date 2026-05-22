"use client";

import dynamic from "next/dynamic";
import "tldraw/tldraw.css";

const Tldraw = dynamic(
  () => import("tldraw").then((m) => ({ default: m.Tldraw })),
  { ssr: false, loading: () => <CanvasFallback /> },
);

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950">
      Loading canvas…
    </div>
  );
}

export function Board({ persistenceKey }: { persistenceKey: string }) {
  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={persistenceKey} />
    </div>
  );
}
