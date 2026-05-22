// Lightweight analytics emitter.
// TODO: swap for posthog-js when key is set.

export function track(event: string, props?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    if (typeof console !== "undefined") {
      console.debug("[analytics]", event, props ?? {});
    }
    return;
  }

  try {
    if (typeof fetch === "undefined") return;
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, props: props ?? {} }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow — analytics must never break the app.
  }
}
