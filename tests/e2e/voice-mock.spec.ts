import { expect, test } from "@playwright/test";
import { installVoiceMocks } from "./fixtures/voice-mocks";

// Smoke test: button -> /api/agent/token -> HUD reaches "connecting".
// We mock getUserMedia + RTCPeerConnection + the token endpoint so CI never
// touches a real microphone or burns ElevenLabs quota.
test.describe("Voice HUD smoke", () => {
  test("Start button transitions HUD into connecting", async ({ page }) => {
    await installVoiceMocks(page);

    // /voice mounts the same VoiceHUD; cheaper to load than the full board.
    await page.goto("/voice");

    const start = page.getByRole("button", { name: /start talking/i });
    await expect(start).toBeVisible({ timeout: 10_000 });

    const tokenRequest = page.waitForRequest(
      (req) => /\/api\/agent\/token/.test(req.url()),
      { timeout: 10_000 },
    );
    await start.click();
    await tokenRequest;

    // HUD must surface "connecting" (or terminal "error" if the stubbed WebRTC
    // path can't complete — both prove the click drove the agent flow).
    const hud = page.locator("text=/connecting|listening|error/i").first();
    await expect(hud).toBeVisible({ timeout: 10_000 });
  });
});
