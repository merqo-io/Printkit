// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LabelsUpgradeMessage } from "./labels-upgrade-message";

describe("LabelsUpgradeMessage", () => {
  it("links the upgrade phrase to the given URL", () => {
    render(
      <LabelsUpgradeMessage
        message="Needs a paid plan. Upgrade in your Merqo account to print labels."
        upgradeUrl="https://www.merqo.io/dashboard"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Upgrade in your Merqo account" }),
    ).toHaveAttribute("href", "https://www.merqo.io/dashboard");
  });

  it("renders plain text when the phrase is absent", () => {
    render(<LabelsUpgradeMessage message="Something else" upgradeUrl="/x" />);
    expect(screen.getByText("Something else")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
