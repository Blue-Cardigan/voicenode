"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type AgentMode = "ptt" | "open";

export type AgentStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface TranscriptEntry {
  id: string;
  role: "user" | "agent";
  text: string;
  at: number;
}

type RawMessage = { source?: string; message?: string };

function entryFromMessage(msg: RawMessage): TranscriptEntry | null {
  if (!msg?.message) return null;
  const role: TranscriptEntry["role"] = msg.source === "user" ? "user" : "agent";
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: msg.message,
    at: Date.now(),
  };
}

export function useVoiceAgent() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<AgentMode>("ptt");
  const startingRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => setErrorMessage(null),
    onDisconnect: () => {},
    onMessage: (msg: unknown) => {
      const entry = entryFromMessage(msg as RawMessage);
      if (entry) setTranscript((t) => [...t, entry]);
    },
    onError: (err: unknown) => {
      const text =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Voice agent error";
      setErrorMessage(text);
    },
  });

  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      setErrorMessage(null);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const tokenRes = await fetch("/api/agent/token", { cache: "no-store" });
      if (!tokenRes.ok) {
        const { error } = await tokenRes.json().catch(() => ({ error: tokenRes.statusText }));
        throw new Error(error || `Token endpoint returned ${tokenRes.status}`);
      }
      const { token } = (await tokenRes.json()) as { token: string };
      await conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      startingRef.current = false;
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // ignore
    }
  }, [conversation]);

  // Space sends a user-activity nudge while connected; the SDK already handles barge-in,
  // so this is not true push-to-talk muting. Track this if PTT muting is needed later.
  useEffect(() => {
    if (mode !== "ptt") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (conversation.status === "connected") {
        conversation.sendUserActivity?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, conversation]);

  // Tear down the WebRTC session on unmount so navigating away releases the mic.
  useEffect(() => {
    return () => {
      void conversation.endSession().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: AgentStatus = (() => {
    if (errorMessage) return "error";
    if (conversation.status === "connecting") return "connecting";
    if (conversation.status !== "connected") return "idle";
    return conversation.isSpeaking ? "speaking" : "listening";
  })();

  return {
    status,
    errorMessage,
    transcript,
    isConnected: conversation.status === "connected",
    isSpeaking: conversation.isSpeaking ?? false,
    mode,
    setMode,
    start,
    stop,
  };
}
