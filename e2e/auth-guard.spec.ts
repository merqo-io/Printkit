import { test, expect } from "@playwright/test";

test.describe("auth guard", () => {
  for (const path of ["/", "/dashboard"]) {
    test(`redirects anonymous ${path} to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("records an anonymous deep link as next on /login", async ({ page }) => {
    await page.goto("/dashboard/printers/new?location=loc-1");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe(
      "/dashboard/printers/new?location=loc-1",
    );
  });

  test("keeps a deep link's fragment on /login", async ({ page }) => {
    await page.goto("/dashboard/printers#booth-loc-1");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/dashboard/printers");
    expect(url.hash).toBe("#booth-loc-1");
  });
});
