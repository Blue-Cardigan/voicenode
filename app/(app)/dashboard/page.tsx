import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER, DEV_AUTH_BYPASS } from "@/lib/supabase/env";
import { createBoard } from "./actions";
import { listDashboardBoards } from "./board-list";
import { BoardCard } from "./board-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await (async () => {
    if (DEV_AUTH_BYPASS) return { id: DEMO_USER.id, email: DEMO_USER.email };
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login?next=/dashboard");
    return { id: data.user.id, email: data.user.email };
  })();

  const boards = DEV_AUTH_BYPASS ? [] : await listDashboardBoards(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          voicenode
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="hidden sm:inline">{user.email}</span>
          {DEV_AUTH_BYPASS ? (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
              DEV bypass
            </span>
          ) : (
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Your boards
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {DEV_AUTH_BYPASS
                ? "DEV bypass active — boards are not persisted. Open the voice playground to try the agent."
                : boards.length === 0
                  ? "No boards yet. Start a new one to brainstorm by voice."
                  : `${boards.length} board${boards.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          {!DEV_AUTH_BYPASS && (
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
          )}
        </div>

        {DEV_AUTH_BYPASS ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/voice"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Open /voice
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Landing
            </Link>
          </div>
        ) : boards.length === 0 ? (
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
