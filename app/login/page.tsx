import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "./sign-in-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(next ?? "/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          voicenode
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick a provider — we only store your name and avatar.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="flex w-full max-w-sm flex-col gap-2">
        <SignInButton provider="google" next={next} />
        <SignInButton provider="github" next={next} />
      </div>
    </main>
  );
}
