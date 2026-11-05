// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SegmentedControl } from "./segmented-control";

describe("SegmentedControl", () => {
  it("marks only the selected option as current and links each choice", () => {
    render(
      <SegmentedControl
        label="Filter labels"
        options={[
          { label: "All labels", href: "/h", selected: false },
          { label: "Needs a booth", href: "/h?unrouted=1", selected: true },
        ]}
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Filter labels" }),
    ).toBeInTheDocument();
    const all = screen.getByRole("link", { name: "All labels" });
    const needs = screen.getByRole("link", { name: "Needs a booth" });
    expect(all).toHaveAttribute("href", "/h");
    expect(all).not.toHaveAttribute("aria-current");
    expect(needs).toHaveAttribute("href", "/h?unrouted=1");
    expect(needs).toHaveAttribute("aria-current", "true");
  });
});
