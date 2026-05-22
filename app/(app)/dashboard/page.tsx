import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          voicenode
        </div>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Your boards
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {data.user.email}
        </p>
      </section>

      <section className="rounded-md border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Board CRUD lands in PR #18.
      </section>
    </main>
  );
}
