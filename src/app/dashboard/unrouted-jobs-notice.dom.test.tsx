// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { UnroutedJobsNotice } from "./unrouted-jobs-notice";

describe("UnroutedJobsNotice", () => {
  it("renders nothing for zero jobs", () => {
    const { container } = render(<UnroutedJobsNotice count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the singular for one job", () => {
    const { container } = render(<UnroutedJobsNotice count={1} />);
    expect(container).toHaveTextContent(
      "Needs a booth (1) This order has no booth yet, so it did not print. Choose a booth for it.",
    );
  });

  it("uses the plural for several jobs", () => {
    const { container } = render(<UnroutedJobsNotice count={2} />);
    expect(container).toHaveTextContent(
      "Needs a booth (2) These orders have no booth yet, so they did not print. Choose a booth for each.",
    );
  });

  it("does not say unrouted", () => {
    const { container } = render(<UnroutedJobsNotice count={2} />);
    expect(container.textContent).not.toMatch(/unrouted/i);
  });
});
