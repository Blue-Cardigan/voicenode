import { createBoard } from "./actions";
import { listAllBoards } from "./board-list";
import { BoardCard } from "./board-card";
import { DashboardAnalyticsTracker } from "./analytics-tracker";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const boards = await listAllBoards();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <DashboardAnalyticsTracker boardCount={boards.length} />
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          voicenode
        </div>
        <span className="text-xs text-zinc-500">No login. Anyone can edit.</span>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Boards
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {boards.length === 0
                ? "No boards yet. Start a new one to brainstorm by voice."
                : `${boards.length} board${boards.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <form action={createBoard} className="flex items-center gap-2">
            <input
              name="title"
              placeholder="New board title"
              className="h-10 w-56 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              New board
            </button>
          </form>
        </div>

        {boards.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800">
            Hit <span className="font-medium">New board</span> to create your first one.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
