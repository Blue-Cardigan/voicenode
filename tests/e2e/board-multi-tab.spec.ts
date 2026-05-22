import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const WELCOME_BOARD = "/b/11111111-1111-1111-1111-111111111111";

// Yjs sync needs a real Supabase realtime channel; env vars on the local
// playwright.config.ts are stubbed for boot. If no real Supabase URL is
// available, skip — this spec is an integration smoke, not a unit test.
const HAS_REAL_SUPABASE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost:54321");

test.describe("Board multi-tab sync", () => {
  test("a shape drawn in tab A appears in tab B within 3s", async ({ browser }) => {
    if (!HAS_REAL_SUPABASE) {
      test.fixme(true, "Requires real Supabase env for Yjs realtime channel.");
      return;
    }

    const ctxA: BrowserContext = await browser.newContext();
    const ctxB: BrowserContext = await browser.newContext();
    const a: Page = await ctxA.newPage();
    const b: Page = await ctxB.newPage();

    try {
      await Promise.all([a.goto(WELCOME_BOARD), b.goto(WELCOME_BOARD)]);

      const canvasA = a.locator(".tl-canvas").first();
      const canvasB = b.locator(".tl-canvas").first();
      await expect(canvasA).toBeVisible({ timeout: 20_000 });
      await expect(canvasB).toBeVisible({ timeout: 20_000 });

      const baselineB = await b.locator("[data-shape-type]").count();

      // Draw a rectangle in tab A.
      const box = await canvasA.boundingBox();
      if (!box) throw new Error("Canvas A has no bounding box");
      await a.keyboard.press("r");
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await a.mouse.move(cx - 80, cy - 60);
      await a.mouse.down();
      await a.mouse.move(cx + 80, cy + 60, { steps: 10 });
      await a.mouse.up();

      // Tab B should see the new shape via Yjs sync.
      await expect
        .poll(() => b.locator("[data-shape-type]").count(), { timeout: 3_000 })
        .toBeGreaterThan(baselineB);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
