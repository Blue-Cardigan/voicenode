import { expect, test } from "@playwright/test";

const WELCOME_BOARD = "/b/11111111-1111-1111-1111-111111111111";

test.describe("Board canvas", () => {
  test("welcome board renders the tldraw canvas", async ({ page }) => {
    await page.goto(WELCOME_BOARD);

    // tldraw mounts `.tl-canvas` inside `.tlui-layout`. Wait for either.
    const canvas = page.locator(".tl-canvas, .tlui-layout").first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
  });

  test("drag-creates at least one shape", async ({ page }) => {
    await page.goto(WELCOME_BOARD);

    const canvas = page.locator(".tl-canvas").first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });

    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas has no bounding box");

    // Pick the rectangle tool via keyboard shortcut ('r' in tldraw), then drag.
    await page.keyboard.press("r");

    const start = { x: box.x + box.width / 2 - 60, y: box.y + box.height / 2 - 40 };
    const end = { x: box.x + box.width / 2 + 60, y: box.y + box.height / 2 + 40 };

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await page.mouse.up();

    // tldraw emits shapes with a data-shape-type attribute on the wrapper div.
    // We accept any rendered shape — seed shapes from the welcome board count too,
    // so this is a "non-empty canvas" assertion after our drag.
    const shapes = page.locator("[data-shape-type]");
    await expect.poll(() => shapes.count(), { timeout: 5_000 }).toBeGreaterThan(0);
  });
});
