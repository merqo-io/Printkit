// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { Wordmark } from "./wordmark";

it("renders PrintKit with the magenta accent on Print", () => {
  const { container } = render(<Wordmark />);
  const root = container.firstElementChild as HTMLElement;
  expect(root.textContent).toBe("PrintKit");
  expect(root.className).toContain("font-display");
  const accent = root.querySelector("span");
  expect(accent?.textContent).toBe("Print");
  expect(accent?.className).toContain("text-magenta-text");
});

it("lets the caller override the size", () => {
  const { container } = render(<Wordmark className="text-3xl" />);
  const cls = (container.firstElementChild as HTMLElement).className;
  expect(cls).toContain("text-3xl");
  expect(cls).not.toContain("text-xl");
});
