export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-8 py-24 text-center dark:bg-zinc-950">
      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        voicenode
      </div>
      <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
        A whiteboard you brainstorm with by talking.
      </h1>
      <p className="max-w-xl text-pretty text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Sticky notes, arrows, groups — created and rearranged live by an AI
        agent you converse with naturally. Multiplayer, public or private,
        powered by ElevenLabs and Supabase.
      </p>
      <a
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Sign in to start
      </a>
    </main>
  );
}
