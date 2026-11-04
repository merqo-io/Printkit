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

it("renders the eyebrow, description and action alongside a single h1", () => {
  render(
    <PageHeader
      eyebrow="Printers"
      title="Your printers"
      description="Everything that prints for you."
      action={<button type="button">Add printer</button>}
    />,
  );
  expect(screen.getByText("Printers")).toHaveClass("uppercase");
  expect(
    screen.getByText("Everything that prints for you."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Add printer" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

it("omits the eyebrow and action when not given", () => {
  const { container } = render(<PageHeader title="Overview" />);
  expect(container.querySelector("p")).toBeNull();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("leaves the way back out when there is none", () => {
  render(<PageHeader title="Overview" description="What this page is for." />);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("What this page is for.")).toBeInTheDocument();
});
