"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

const LABEL: Record<Provider, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

export function SignInButton({
  provider,
  next,
}: {
  provider: Provider;
  next?: string;
}) {
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (next) redirectTo.searchParams.set("next", next);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) {
        window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
    >
      {pending ? "Redirecting…" : LABEL[provider]}
    </button>
  );
}
