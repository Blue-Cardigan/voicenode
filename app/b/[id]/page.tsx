import Link from "next/link";
import { Board } from "@/components/canvas/Board";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Board boardId={id} />

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
    </div>
  );
}
