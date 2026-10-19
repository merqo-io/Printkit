// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { PageHeader } from "./page-header";

it("renders the way back as the shared BackButton", () => {
  render(
    <PageHeader
      title="Choose a printer"
      back={{ href: "/dashboard/printers", label: "Printers" }}
    />,
  );
  const back = screen.getByRole("link", { name: "Printers" });
  expect(back).toHaveAttribute("href", "/dashboard/printers");
  expect(back).toHaveAttribute("data-slot", "button");
  expect(
    screen.getByRole("heading", { level: 1, name: "Choose a printer" }),
  ).toBeInTheDocument();
});

it("leaves the way back out when there is none", () => {
  render(<PageHeader title="Overview" description="What this page is for." />);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("What this page is for.")).toBeInTheDocument();
});
