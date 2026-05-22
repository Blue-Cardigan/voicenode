import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders brand chip and anon CTAs", async ({ page }) => {
    await page.goto("/");

    // Brand chip: "voicenode" appears in the header eyebrow.
    await expect(page.getByText("voicenode", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Primary CTA: "Open dashboard" links to /dashboard (no auth gate now).
    const dashCta = page.getByRole("link", { name: /open dashboard/i });
    await expect(dashCta).toBeVisible();
    await expect(dashCta).toHaveAttribute("href", /\/dashboard/);

    // Secondary CTA: "Try the welcome board" jumps to the seeded welcome board.
    const welcomeCta = page.getByRole("link", { name: /welcome board/i });
    await expect(welcomeCta).toBeVisible();
    await expect(welcomeCta).toHaveAttribute(
      "href",
      /\/b\/11111111-1111-1111-1111-111111111111/,
    );
  });
});
