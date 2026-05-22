"use client";

/* eslint-disable react-hooks/refs --
   The clientTools Proxy traps are invoked by the ElevenLabs SDK during tool
   calls (post-render), not during React's render. Reading toolsRef.current
   inside them is safe; the rule can't infer this. */

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AgentMode = "ptt" | "open";

export type ClientTools = Record<string, (args: Record<string, unknown>) => unknown>;

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

export interface VoiceAgentOptions {
  /**
   * Client-side tools the agent can invoke. Pass a stable reference (e.g. via
   * useMemo) so the conversation does not re-init on every render.
   */
  clientTools?: ClientTools;
  /**
   * Invoked whenever the conversation transitions from a user message to an
   * agent message (i.e. a new agent turn begins). Use this to coalesce a
   * burst of tool calls into one history/undo entry.
   */
  onTurnBoundary?: () => void;
}

const MIC_DEVICE_STORAGE_KEY = "voicenode:mic-device-id";

export function useVoiceAgent(options: VoiceAgentOptions = {}) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<AgentMode>("ptt");
  const startingRef = useRef(false);
  // Tracks the source of the last message so we can fire onTurnBoundary on
  // user -> agent transitions only.
  const lastSourceRef = useRef<"user" | "agent" | null>(null);

  // Keep clientTools in a ref so the agent always invokes the latest handlers,
  // avoiding session re-init when the canvas editor identity changes.
  const toolsRef = useRef<ClientTools>(options.clientTools ?? {});
  useEffect(() => {
    toolsRef.current = options.clientTools ?? {};
  }, [options.clientTools]);

  const onTurnBoundaryRef = useRef(options.onTurnBoundary);
  useEffect(() => {
    onTurnBoundaryRef.current = options.onTurnBoundary;
  }, [options.onTurnBoundary]);

  // ElevenLabs requires tool returns to be string | number | void; we wrap
  // each handler so it always returns a JSON string of the structured result.
  const clientTools = useMemo(() => {
    type SDKHandler = (args: Record<string, unknown>) => string | Promise<string>;
    return new Proxy({} as Record<string, SDKHandler>, {
      get: (_t, name: string) => {
        const handler: SDKHandler = async (args) => {
          const fn = toolsRef.current[name];
          let result: unknown;
          if (!fn) {
            result = { status: "error", message: `Tool ${name} not registered.` };
          } else {
            try {
              result = await fn(args);
            } catch (e) {
              result = {
                status: "error",
                message: e instanceof Error ? e.message : String(e),
              };
            }
          }
          return JSON.stringify(result ?? { status: "ok" });
        };
        return handler;
      },
      // Exclude internal helpers (markTurnBoundary, etc.) from the keys the
      // SDK enumerates as callable tools — they're for the host hook, not
      // the agent.
      ownKeys: () =>
        Object.keys(toolsRef.current).filter((k) => k !== "markTurnBoundary"),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
  }, []);

  const conversation = useConversation({
    clientTools,
    onConnect: () => setErrorMessage(null),
    onDisconnect: () => {},
    onMessage: (msg: unknown) => {
      const raw = msg as RawMessage;
      const source: "user" | "agent" = raw?.source === "user" ? "user" : "agent";
      // Fire turn boundary on user -> agent transitions so tool-call bursts
      // within a single agent turn collapse into one undo entry.
      if (source === "agent" && lastSourceRef.current === "user") {
        try {
          onTurnBoundaryRef.current?.();
        } catch {
          // ignore — boundary callback errors should never crash the session
        }
        // Also call the convention-named markTurnBoundary handler on the
        // client-tools bag if present. This lets buildClientTools() expose
        // turn-scoped history-marking without the consumer needing to wire
        // a separate callback through.
        try {
          const tools = toolsRef.current as ClientTools & {
            markTurnBoundary?: () => void;
          };
          tools.markTurnBoundary?.();
        } catch {
          // ignore
        }
      }
      lastSourceRef.current = source;
      const entry = entryFromMessage(raw);
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
    // Fires when the agent tries to invoke a tool that the SDK didn't find in
    // our `clientTools` Proxy. Almost always means the tool name registered in
    // the ElevenLabs dashboard doesn't match the key we registered. Surface it
    // loudly so the cause is obvious — silent failures here are the #1 reason
    // "the agent doesn't do anything".
    onUnhandledClientToolCall: (
      params: { tool_name?: string; parameters?: unknown } | unknown,
    ) => {
      const p = params as { tool_name?: string; parameters?: unknown };
      const name = p?.tool_name ?? "<unknown>";
      const msg = `Agent called unregistered tool: ${name}. Run \`pnpm sync-eleven-tools\` or check the agent's tool config.`;
      console.warn("[voice]", msg, p?.parameters);
      setErrorMessage(msg);
    },
  });

  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      setErrorMessage(null);
      const deviceId =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(MIC_DEVICE_STORAGE_KEY) ?? undefined)
          : undefined;
      try {
        await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
      } catch (mediaErr) {
        // Selected device may be unplugged or otherwise unavailable; fall back
        // to the system default rather than failing the whole session.
        if (
          deviceId &&
          mediaErr instanceof Error &&
          (mediaErr.name === "OverconstrainedError" ||
            mediaErr.name === "NotFoundError")
        ) {
          console.warn(
            `[voice] Mic device "${deviceId}" unavailable (${mediaErr.name}); falling back to default.`,
          );
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw mediaErr;
        }
      }
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

  const sendContextualUpdate = useCallback(
    (text: string) => {
      if (!text) return;
      if (conversation.status !== "connected") return;
      const c = conversation as unknown as {
        sendContextualUpdate?: (t: string) => void;
      };
      try {
        c.sendContextualUpdate?.(text);
      } catch {
        // ignore — SDK may throw if session torn down mid-call
      }
    },
    [conversation],
  );

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // ignore
    }
  }, [conversation]);

  // Space sends a user-activity nudge while connected; the SDK already handles barge-in,
  // so this is not true push-to-talk muting. Revisit if PTT muting is needed later.
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
      try {
        void conversation.endSession();
      } catch {
        // ignore — already torn down
      }
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
    sendContextualUpdate,
  };
}
