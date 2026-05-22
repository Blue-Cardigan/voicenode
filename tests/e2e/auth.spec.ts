import { expect, test } from "@playwright/test";

test.describe("Auth surface", () => {
  test("login page exposes Google and GitHub providers", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible({ timeout: 10_000 });

    // Provider buttons — these are <button> elements in <SignInButton />.
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
  });

  test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
    const response = await page.goto("/dashboard");
    // Either the server redirected, or middleware sent us to /login.
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 10_000 });
    // Don't assert response.status — Next can rewrite or 200 after redirect.
    expect(response).not.toBeNull();
  });
});
