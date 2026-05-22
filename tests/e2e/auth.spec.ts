import { expect, test } from "@playwright/test";

// voicenode is anon-only — no login wall. This spec used to assert the
// /login redirect; replaced with a smoke that confirms /dashboard and a
// seeded board page are reachable without any auth round-trip.
test.describe("No auth required", () => {
  test("/dashboard loads directly without redirecting to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /boards/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("seeded welcome board opens directly", async ({ page }) => {
    await page.goto("/b/11111111-1111-1111-1111-111111111111");
    await expect(page).toHaveURL(/\/b\/11111111/, { timeout: 10_000 });
    // No redirect to /login expected.
    expect(page.url()).not.toMatch(/\/login/);
  });
});
