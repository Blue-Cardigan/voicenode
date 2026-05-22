import { expect, test } from "@playwright/test";

const SEEDED_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "33333333-3333-3333-3333-333333333333",
];

test.describe("Dashboard", () => {
  test("lists at least the three seeded boards, each linking to /b/[id]", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /boards/i })).toBeVisible({
      timeout: 15_000,
    });

    // Each seeded board renders a `<Link href="/b/[id]">`. Assert all three.
    for (const id of SEEDED_IDS) {
      const link = page.locator(`a[href="/b/${id}"]`).first();
      await expect(link, `seeded board ${id} link visible`).toBeVisible({
        timeout: 10_000,
      });
    }

    // Sanity: at least 3 board cards in the list.
    const boardLinks = page.locator('a[href^="/b/"]');
    await expect.poll(() => boardLinks.count(), { timeout: 5_000 }).toBeGreaterThanOrEqual(3);
  });

  test("New board form creates a board and redirects to /b/[new-id]", async ({ page }) => {
    await page.goto("/dashboard");

    const title = `E2E ${Date.now()}`;
    await page.getByPlaceholder(/new board title/i).fill(title);
    await page.getByRole("button", { name: /^new board$/i }).click();

    // Server action -> redirect to /b/<uuid>.
    await page.waitForURL(/\/b\/[0-9a-f-]{36}$/i, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/b\/[0-9a-f-]{36}$/i);
  });
});
