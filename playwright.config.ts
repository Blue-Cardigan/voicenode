import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Forward auth/agent env so local `pnpm dev` boots without a real .env.
    // CI provides these via .github/workflows/e2e.yml; locally we fall back to
    // the same stub values so tests don't require manual setup.
    env: {
      DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS ?? "1",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "stub-anon-key",
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "stub-service-role-key",
      ELEVENLABS_API_KEY:
        process.env.ELEVENLABS_API_KEY ?? "stub-elevenlabs-key",
      ELEVENLABS_AGENT_ID:
        process.env.ELEVENLABS_AGENT_ID ?? "stub-agent-id",
    },
  },
});
