"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { Transcript } from "@/components/voice/Transcript";
import { VoiceHUD } from "@/components/voice/VoiceHUD";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";

function Inner() {
  const v = useVoiceAgent();
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <VoiceHUD
        status={v.status}
        errorMessage={v.errorMessage}
        isConnected={v.isConnected}
        mode={v.mode}
        onToggleMode={() => v.setMode(v.mode === "ptt" ? "open" : "ptt")}
        onStart={v.start}
        onStop={v.stop}
      />
      <Transcript entries={v.transcript} />
    </div>
  );
}

export function VoicePlayground() {
  return (
    <ConversationProvider>
      <Inner />
    </ConversationProvider>
  );
}
