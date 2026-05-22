// Next.js instrumentation hook.
// Runs once per server process (Node.js or Edge runtime) at startup.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // TODO: Sentry server init when SENTRY_DSN is set.
    //   const Sentry = await import("@sentry/nextjs");
    //   Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // TODO: Sentry edge init when SENTRY_DSN is set.
  }
}
