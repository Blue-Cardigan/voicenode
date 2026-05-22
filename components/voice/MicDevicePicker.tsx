"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "voicenode:mic-device-id";

/**
 * Lists available audio input devices and persists the user's choice to
 * localStorage. The selected deviceId is NOT yet wired through to the
 * ElevenLabs session — that requires changes to useVoiceAgent (out of scope
 * for issue #11 UX polish). See PR notes / follow-up issue.
 */
export function MicDevicePicker({
  disabled = false,
  className = "",
}: {
  disabled?: boolean;
  className?: string;
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function load() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const list = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const inputs = list.filter((d) => d.kind === "audioinput");
        setDevices(inputs);
        // Labels are only populated after the user has granted mic permission;
        // if every label is empty, assume we don't yet have permission.
        if (inputs.length > 0 && inputs.every((d) => !d.label)) {
          setPermissionDenied(true);
        } else {
          setPermissionDenied(false);
        }
      } catch {
        // ignore — picker just stays empty
      }
    }

    void load();
    navigator.mediaDevices?.addEventListener?.("devicechange", load);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.("devicechange", load);
    };
  }, []);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelected(value);
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, value);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore quota / privacy-mode failures
    }
  }

  if (devices.length === 0) return null;

  return (
    <label
      className={`flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      <span className="sr-only">Microphone</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 text-zinc-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <path d="M12 19v3" />
      </svg>
      <select
        aria-label="Microphone input device"
        value={selected}
        onChange={onChange}
        disabled={disabled}
        className="max-w-[10rem] truncate rounded-md border border-zinc-200 bg-transparent px-1.5 py-0.5 text-xs text-zinc-600 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-400"
      >
        <option value="">
          {permissionDenied ? "Grant mic access" : "Default mic"}
        </option>
        {devices.map((d, i) => (
          <option key={d.deviceId || `mic-${i}`} value={d.deviceId}>
            {d.label || `Microphone ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}
