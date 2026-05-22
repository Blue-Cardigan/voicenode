import { expect, test } from "@playwright/test";
import { installVoiceMocks } from "./fixtures/voice-mocks";

const WELCOME_BOARD = "/b/11111111-1111-1111-1111-111111111111";

// This spec proves the "agent invokes a client tool -> tldraw renders a shape"
// path end-to-end. The real flow goes:
//   ElevenLabs SDK (WebRTC + WS) -> clientTools Proxy -> buildClientTools(editor)
// We can't easily intercept the SDK's WebSocket signalling channel from
// Playwright; doing so reliably requires a dedicated transport mock. Instead,
// the plan is to expose a `window.__voicenodeMockTool(name, args)` hook in dev
// that drives the same clientTools registry directly. That hook doesn't yet
// exist in app code, so this spec is `.fixme` until it does — but the
// scaffolding (mocks, navigation, assertion) is ready.
test.describe("Voice tool: createNote", () => {
  test.fixme(
    "agent createNote({text}) renders a sticky note on the canvas",
    async ({ page }) => {
      await installVoiceMocks(page);
      await page.goto(WELCOME_BOARD);

      const canvas = page.locator(".tl-canvas").first();
      await expect(canvas).toBeVisible({ timeout: 20_000 });

      // Drive the same code path the SDK callback uses.
      // Requires app to expose `window.__voicenodeMockTool` in dev/test.
      await page.evaluate(async () => {
        type MockTool = (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<unknown> | unknown;
        const w = window as unknown as { __voicenodeMockTool?: MockTool };
        if (!w.__voicenodeMockTool) {
          throw new Error("window.__voicenodeMockTool not installed");
        }
        await w.__voicenodeMockTool("createNote", { text: "pricing" });
      });

      // tldraw note shapes carry data-shape-type="note" on the wrapper.
      const note = page.locator('[data-shape-type="note"]', { hasText: "pricing" });
      await expect(note).toBeVisible({ timeout: 5_000 });
    },
  );
});
