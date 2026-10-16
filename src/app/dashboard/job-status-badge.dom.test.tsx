// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobStatusBadge } from "./job-status-badge";

describe("JobStatusBadge", () => {
  it.each([
    ["queued", "Queued", "text-secondary"],
    ["sent", "Sent", "text-info-text"],
    ["printed", "Printed", "text-success-text"],
    ["failed", "Failed", "text-destructive"],
  ] as const)(
    "renders the %s label with its status color",
    (status, label, colorClass) => {
      render(<JobStatusBadge status={status} />);
      const badge = screen.getByText(label).closest("span");
      expect(badge).toHaveClass(colorClass);
    },
  );

  it("renders the leading dot indicator", () => {
    render(<JobStatusBadge status="printed" />);
    const badge = screen.getByText("Printed").closest("span");
    expect(
      badge?.querySelector("span.rounded-full.bg-current"),
    ).toBeInTheDocument();
  });
});
