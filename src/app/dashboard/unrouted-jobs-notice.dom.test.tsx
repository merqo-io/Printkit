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
      "1 unrouted print job needs a booth assigned before it can print.",
    );
  });

  it("uses the plural for several jobs", () => {
    const { container } = render(<UnroutedJobsNotice count={2} />);
    expect(container).toHaveTextContent(
      "2 unrouted print jobs need a booth assigned before they can print.",
    );
  });
});
