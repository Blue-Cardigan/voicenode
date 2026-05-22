"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "4rem 1.5rem",
          textAlign: "center",
          backgroundColor: "#fafafa",
          color: "#09090b",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#71717a",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              backgroundColor: "#10b981",
              display: "inline-block",
            }}
          />
          voicenode
        </div>
        <div style={{ maxWidth: 480 }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: "0 0 0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#52525b", margin: 0 }}>
            The app hit an unexpected error. Try again.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 11,
                color: "#a1a1aa",
                marginTop: "0.75rem",
              }}
            >
              error {error.digest}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: 40,
            padding: "0 1rem",
            borderRadius: 6,
            border: 0,
            backgroundColor: "#09090b",
            color: "#fafafa",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
