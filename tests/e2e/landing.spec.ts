import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders brand chip and sign-in CTA", async ({ page }) => {
    await page.goto("/");

    // Brand chip: "voicenode" appears in the header eyebrow.
    await expect(page.getByText("voicenode", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Primary CTA links to /login.
    const cta = page.getByRole("link", { name: /sign in/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /\/login/);
  });
});
