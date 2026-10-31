import { test, expect } from "@playwright/test";

test.describe("dashboard states in a real browser", () => {
  test("unrouted-jobs notice reads as one sentence for one and many", async ({
    page,
  }, testInfo) => {
    await page.goto("/dev/ui-states/unrouted");

    const one = page.getByTestId("unrouted-one");
    await expect(one).toHaveText(
      "Needs a booth (1) This order has no booth yet, so it did not print. Choose a booth for it.",
    );
    await expect(
      one.getByRole("link", { name: "Needs a booth (1)" }),
    ).toHaveAttribute("href", "/dashboard/history?unrouted=1");

    const many = page.getByTestId("unrouted-many");
    await expect(many).toHaveText(
      "Needs a booth (3) These orders have no booth yet, so they did not print. Choose a booth for each.",
    );
    await expect(
      many.getByRole("link", { name: "Needs a booth (3)" }),
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
