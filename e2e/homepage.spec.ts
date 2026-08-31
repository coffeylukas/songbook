import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
  test("responds OK and renders the app shell", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.ok()).toBe(true);
    // Asserted against `metadata.title` in app/layout.tsx rather than page body
    // copy, so this stays green when the real homepage replaces the scaffold.
    await expect(page).toHaveTitle("Song Book");
  });
});
