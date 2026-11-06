// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  SetupStepsEmpty,
  boothPrintingSteps,
  safeQkitUrl,
} from "./setup-steps-empty";

afterEach(cleanup);

it("renders a dashed block with a heading and numbered steps", () => {
  render(
    <SetupStepsEmpty
      heading="Nothing yet"
      headingId="h"
      steps={[{ done: true, body: "One" }, { body: "Two" }, { body: "Three" }]}
    />,
  );
  const region = screen.getByRole("region", { name: "Nothing yet" });
  expect(region.className).toContain("border-dashed");
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByText("Two").closest("[aria-current]")).not.toBeNull();
});

it("links qkit only for an http(s) URL", () => {
  expect(safeQkitUrl("javascript:alert(1)")).toBeNull();
  expect(safeQkitUrl("not a url")).toBeNull();
  expect(safeQkitUrl(undefined)).toBeNull();
  render(
    <SetupStepsEmpty
      heading="H"
      steps={boothPrintingSteps("https://qkit.example.com")}
    />,
  );
  expect(screen.getByRole("link", { name: "qkit" })).toHaveAttribute(
    "href",
    "https://qkit.example.com/",
  );
  expect(screen.getByText("Pick your printer here.")).toBeVisible();
});
