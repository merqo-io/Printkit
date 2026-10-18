import { test, expect } from "@playwright/test";

test.describe("dashboard states in a real browser", () => {
  test("unrouted-jobs notice reads as one sentence for one and many", async ({
    page,
  }, testInfo) => {
    await page.goto("/dev/ui-states/unrouted");

    const one = page.getByTestId("unrouted-one");
    await expect(one).toHaveText(
      "1 unrouted print job needs a booth assigned before it can print.",
    );
    await expect(
      one.getByRole("link", { name: "1 unrouted print job" }),
    ).toHaveAttribute("href", "/dashboard/history?unrouted=1");

    const many = page.getByTestId("unrouted-many");
    await expect(many).toHaveText(
      "3 unrouted print jobs need a booth assigned before they can print.",
    );
    await expect(
      many.getByRole("link", { name: "3 unrouted print jobs" }),
    ).toHaveAttribute("href", "/dashboard/history?unrouted=1");

    await page.screenshot({
      path: testInfo.outputPath("unrouted-notice.png"),
      fullPage: true,
    });
  });

  test("error page renders inside its layout and Try again re-renders the server page", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const cookie = { name: "ui-states-fail", url: baseURL ?? "" };
    await context.addCookies([{ ...cookie, value: "1" }]);
    await page.goto("/dev/ui-states/error");

    await expect(
      page.getByRole("heading", { name: "Something went wrong" }),
    ).toBeVisible();
    await expect(page.getByTestId("ui-states-frame")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to overview" }),
    ).toHaveAttribute("href", "/dashboard");

    await page.screenshot({
      path: testInfo.outputPath("dashboard-error.png"),
      fullPage: true,
    });

    await context.addCookies([{ ...cookie, value: "0" }]);
    await page.getByRole("button", { name: "Try again" }).click();

    await expect(page.getByTestId("ui-states-recovered")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Something went wrong" }),
    ).toHaveCount(0);
  });
});
