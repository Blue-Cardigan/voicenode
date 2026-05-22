import { expect, test } from "@playwright/test";
import { installVoiceMocks } from "./fixtures/voice-mocks";

// Smoke test: button -> /api/agent/token -> HUD reaches "connecting".
// We mock getUserMedia + RTCPeerConnection + the token endpoint so CI never
// touches a real microphone or burns ElevenLabs quota. Deep tool-call
// simulation is a follow-up; see tests/e2e/fixtures/voice-mocks.ts.
test.describe("Voice HUD smoke", () => {
  test("Start button transitions HUD into connecting", async ({ page }) => {
    await installVoiceMocks(page);

    // The board page (/b/[id]) lands in #9; for now hit the /voice playground
    // which mounts the same VoiceHUD component.
    await page.goto("/voice");

    const start = page.getByRole("button", { name: /start talking/i });
    await expect(start).toBeVisible({ timeout: 10_000 });

    // Wait for the stubbed token endpoint to be hit — that's how we know the
    // click actually drove the agent flow, rather than the HUD already showing
    // "error" from an unrelated boot-time failure.
    const tokenRequest = page.waitForRequest(
      (req) => /\/api\/agent\/token/.test(req.url()),
      { timeout: 10_000 }
    );
    await start.click();
    await tokenRequest;

    const hud = page.locator("text=/connecting|listening|error/i").first();
    await expect(hud).toBeVisible({ timeout: 10_000 });
  });
});
