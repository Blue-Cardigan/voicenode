import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER, DEV_AUTH_BYPASS } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await (async () => {
    if (DEV_AUTH_BYPASS) return { id: DEMO_USER.id, email: DEMO_USER.email };
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login?next=/dashboard");
    return { id: data.user.id, email: data.user.email };
  })();

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
              <button type="submit" className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Demo</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Auth is bypassed locally. Open the voice playground to try the agent.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/voice" className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200">
            Open /voice
          </Link>
          <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
            Landing
          </Link>
        </div>
      </section>
    </main>
  );
}
