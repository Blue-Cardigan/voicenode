import { VoicePlayground } from "./voice-playground";

export const dynamic = "force-dynamic";

export default function VoicePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-6 px-6 py-16">
      <header className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          voicenode · vibenode playground
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Talk to the agent
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          A pre-canvas playground for the voice loop. Canvas tools land in #9.
        </p>
      </header>

      <VoicePlayground />
    </main>
  );
}
