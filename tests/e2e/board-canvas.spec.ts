import { expect, test } from "@playwright/test";

// TODO(#14): the board page at /b/[id] lands with the tldraw canvas in #9.
// Once merged, replace `.fixme` with `()` and confirm:
//   - the canvas root selector (likely `.tl-container` or `[data-testid="tldraw"]`)
//   - whether DEV_AUTH_BYPASS=1 lets us hit /b/test-board without a Supabase session
//   - the expected shape DOM node selector (e.g. `.tl-shape`)
test.fixme("Board canvas — drag-creates a shape", async ({ page }) => {
  await page.goto("/b/test-board");

  const canvas = page.locator(".tl-container, [data-testid='tldraw']").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas has no bounding box");

  // Drag to create a shape with the default tool.
  const start = { x: box.x + 120, y: box.y + 120 };
  const end = { x: box.x + 280, y: box.y + 220 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();

  await expect(page.locator(".tl-shape")).toHaveCount(1, { timeout: 5_000 });
});
