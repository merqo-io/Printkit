import { test, expect } from "@playwright/test";

test.describe("auth guard", () => {
  test("redirects anonymous /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("keeps anonymous / on the public landing", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Print qkit orders on a Bluetooth printer.",
      }),
    ).toBeVisible();
  });

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
