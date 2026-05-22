This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Running tests

End-to-end coverage uses [Playwright](https://playwright.dev). Specs live in
`tests/e2e/` and target landing, auth, the board canvas, and the voice HUD
(with ElevenLabs + WebRTC mocked).

```bash
pnpm e2e            # run the full suite (boots `pnpm dev` if not running)
pnpm exec playwright test --list   # enumerate specs without executing them
pnpm exec playwright test --ui     # interactive runner
```

The browser binaries are **not** installed by `pnpm install`. CI runs
`pnpm exec playwright install --with-deps chromium`; locally, run the same
command once before executing the suite.

Environment for the suite is stubbed in `.github/workflows/e2e.yml` — set the
same Supabase / ElevenLabs placeholder vars locally if `pnpm dev` complains.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Operations

### Environment variables

Required:

- `ELEVENLABS_API_KEY` — server-side key used to mint signed agent tokens.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable (anon) key.

Optional:

- `DEV_AUTH_BYPASS=1` — local-only flag that skips auth so you can demo without
  a Supabase project. Never set in production.
- `SENTRY_DSN` — when set, `instrumentation.ts` is ready to initialise Sentry
  (wiring is a stub today; uncomment when the SDK is installed).

### Run locally

```bash
pnpm install
pnpm dev
```

### Migrations

Schema lives in `supabase/migrations/`. Apply with the Supabase CLI:

```bash
supabase db push
```

### Observability hooks

- **Error boundaries** — every route segment (`app/error.tsx`,
  `app/global-error.tsx`, `app/b/[id]/error.tsx`,
  `app/(app)/dashboard/error.tsx`) and a branded `app/not-found.tsx` page.
- **Analytics** — `lib/analytics/track(event, props)` no-ops in dev (`console.debug`)
  and POSTs to `/api/analytics` in production. The route logs to the server; swap
  in PostHog / Segment when keys are available.
- **Instrumentation** — `instrumentation.ts` runs once per server process and is
  the place to wire Sentry (or any other APM) once a DSN is provisioned.

### Deploy steps

1. Set the required env vars on the host (Vercel project, container, etc.).
2. Run database migrations against the target Supabase project.
3. `pnpm build` produces the production bundle; the platform serves it.
4. Smoke-check `/dashboard`, create a board, confirm voice connects.
