# Rate limiting

Two layers of abuse defence for anonymous edits:

1. **Per-instance, in-memory token bucket** (`in-memory.ts`).
   - Used by hot edge-ish endpoints like `/api/agent/token`.
   - On Vercel Fluid Compute, a warm instance keeps its bucket between
     concurrent and sequential requests. Across instances, limits are
     effectively per-instance — not perfect, but good as a first line.
   - Zero dependencies, no I/O.

2. **Postgres bucket** (`server.ts` → `public.bump_rate_limit`).
   - Used for board mutations (`createBoard`, `renameBoard`, `deleteBoard`).
   - Single shared bucket table keyed by an arbitrary string (`ip:1.2.3.4`).
   - Fixed-window counter implemented with a single `UPSERT ... RETURNING`.
     Cheap, race-safe, and good enough for low-double-digit RPS.
   - Fails open: if Postgres errors out, we let the request through rather
     than DOS our own users.

## Why not Upstash / Redis yet?

We don't have it provisioned, and the Postgres path piggy-backs on a database
we already pay for. When/if accuracy or cross-region consistency matter, swap
`lib/rate-limit/server.ts` for an Upstash `Ratelimit` instance — the call
sites only depend on the `rateLimitBump(key, max, windowSeconds)` signature.

## Tuning

Limits live next to the call sites:

- `createBoard`: 5 / IP / minute
- `renameBoard` + `deleteBoard`: 20 / IP / minute (shared bucket)
- `GET /api/agent/token`: 30 / IP / minute (in-memory)

Bump them if you see false positives in BotID-clean traffic.
