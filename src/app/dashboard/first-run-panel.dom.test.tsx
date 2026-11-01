// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FirstRunPanel } from "./first-run-panel";

const none = { hasBooth: false, hasPrinter: false, hasPrintedJob: false };

describe("FirstRunPanel", () => {
  it("shows three steps with none done", () => {
    render(<FirstRunPanel progress={none} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText(/\(done\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/turn on printing for your booth/i)).toBeVisible();
  });

  it("marks finished steps done and the first open step as next", () => {
    render(<FirstRunPanel progress={{ ...none, hasBooth: true }} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("(done)");
    expect(items[1]).toHaveTextContent("(next)");
    expect(items[2]).not.toHaveTextContent("(next)");
  });

  it("does not tick step 3 when a job printed but no printer exists", () => {
    render(
      <FirstRunPanel
        progress={{ hasBooth: true, hasPrinter: false, hasPrintedJob: true }}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("(done)");
    expect(items[1]).toHaveTextContent("(next)");
    expect(items[2]).not.toHaveTextContent("(done)");
  });

  it("links steps 2 and 3 to the printers page", () => {
    render(<FirstRunPanel progress={none} />);
    expect(
      screen.getByRole("link", { name: "Pick your printer." }),
    ).toHaveAttribute("href", "/dashboard/printers");
    expect(
      screen.getByRole("link", { name: "Print your first label." }),
    ).toHaveAttribute("href", "/dashboard/printers");
  });

  it("links step 1 to qkit only when a URL is set", () => {
    const { rerender } = render(<FirstRunPanel progress={none} />);
    expect(
      screen.queryByRole("link", { name: "qkit" }),
    ).not.toBeInTheDocument();
    rerender(
      <FirstRunPanel progress={none} qkitUrl="https://qkit.example.com" />,
    );
    expect(screen.getByRole("link", { name: "qkit" })).toHaveAttribute(
      "href",
      "https://qkit.example.com/",
    );
  });

  it("ignores a qkit URL that is not http(s)", () => {
    render(<FirstRunPanel progress={none} qkitUrl="javascript:alert(1)" />);
    expect(
      screen.queryByRole("link", { name: "qkit" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing once every step is done", () => {
    const { container } = render(
      <FirstRunPanel
        progress={{ hasBooth: true, hasPrinter: true, hasPrintedJob: true }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
