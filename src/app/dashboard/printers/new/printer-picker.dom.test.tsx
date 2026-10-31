// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PrinterPicker } from "./printer-picker";

beforeAll(() => {
  // Radix popovers measure their trigger; jsdom has no layout engine.
  Element.prototype.hasPointerCapture = () => false;
});

function renderPicker(includeDev = false) {
  render(<PrinterPicker locationId="loc-1" includeDev={includeDev} />);
}

function cardNames(): string[] {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent ?? "");
}

function card(printerId: string): HTMLElement {
  const found = document.querySelector(`[data-printer="${printerId}"]`);
  if (!found) throw new Error(`No card for ${printerId}`);
  return found as HTMLElement;
}

describe("PrinterPicker", () => {
  it("says up front which printers work with an iPad alone, and links to why", () => {
    renderPicker();

    expect(screen.getByText(/works with just your iPad/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A Bluetooth-only printer needs a helper device/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read why" })).toHaveAttribute(
      "href",
      "/guides/bluetooth-printers",
    );
  });

  it("starts by showing only printers that need no helper device", () => {
    renderPicker();

    expect(cardNames()).toContain("FP-N20H");
    expect(cardNames()).not.toContain("B1");
  });

  it("shows Bluetooth printers once the iPad filter is turned off", () => {
    renderPicker();

    fireEvent.click(
      screen.getByRole("button", { name: "Works with iPad alone" }),
    );

    expect(cardNames()).toContain("B1");
  });

  it("marks a Bluetooth printer as the most setup and links to the guide", () => {
    renderPicker();
    fireEvent.click(
      screen.getByRole("button", { name: "Works with iPad alone" }),
    );

    const bluetooth = card("niimbot-b1");

    expect(within(bluetooth).getByText(/not recommended/i)).toBeInTheDocument();
    expect(
      within(bluetooth).getByRole("link", { name: /read what this/i }),
    ).toHaveAttribute("href", "/guides/bluetooth-printers");
  });

  it("filters by connection", () => {
    renderPicker();
    fireEvent.click(
      screen.getByRole("button", { name: "Works with iPad alone" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "4G" }));

    expect(cardNames()).toEqual(["FP-N20H"]);
  });

  it("filters by the label width a stall actually uses", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "60 mm" }));

    expect(cardNames()).not.toContain("FP-N20H");
    expect(cardNames()).toContain("mC-Label2");
  });

  it("says so plainly when the filters leave nothing", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "60 mm" }));
    fireEvent.click(screen.getByRole("button", { name: "4G" }));

    expect(
      screen.getByText(/no printer matches those filters/i),
    ).toBeInTheDocument();
  });

  it("sorts by price when asked", () => {
    renderPicker();
    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "price" },
    });

    expect(cardNames().slice(0, 2)).toEqual(["FP-N20W", "FP-N20H"]);
  });

  it("puts the cheapest printer with no monthly cost first by default", () => {
    renderPicker();
    expect(cardNames().slice(0, 3)).toEqual([
      "FP-N20W",
      "mC-Label2",
      "FP-N20H",
    ]);
  });

  it("states each printer's monthly cost", () => {
    renderPicker();
    expect(screen.getAllByText("4G data plan")).toHaveLength(1);
    expect(screen.getAllByText("None").length).toBeGreaterThan(0);
  });

  it("hides the development printer unless it is asked for", () => {
    renderPicker();
    expect(cardNames()).not.toContain("Virtual printer");

    render(<PrinterPicker locationId="loc-1" includeDev />);
    expect(cardNames()).toContain("Virtual printer");
  });

  it("carries the booth through to the setup link", () => {
    renderPicker();

    const link = screen.getAllByRole("link", {
      name: /set up this printer/i,
    })[0];
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/printers/setup?location=loc-1&model=feie-fp-n20w",
    );
  });

  it("explains every badge with a button a finger can hit", () => {
    renderPicker();

    const info = screen.getAllByRole("button", { name: /what does/i });
    expect(info.length).toBeGreaterThan(0);
  });

  it("puts at most one info button on each card", () => {
    renderPicker();
    fireEvent.click(
      screen.getByRole("button", { name: "Works with iPad alone" }),
    );

    const cards = document.querySelectorAll<HTMLElement>("[data-printer]");
    expect(cards.length).toBeGreaterThan(1);
    for (const element of cards) {
      expect(
        within(element).queryAllByRole("button", { name: /what does/i }).length,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("keeps secondary facts behind one Details disclosure", () => {
    renderPicker();

    const details = card("feie-fp-n20h").querySelectorAll("details");
    expect(details).toHaveLength(1);
    expect(details[0]).not.toHaveAttribute("open");
    expect(within(details[0]).getByText("Monthly cost")).toBeInTheDocument();
    expect(within(details[0]).getByText("Setup")).toBeInTheDocument();
  });

  it("shows how it connects and the label width up front", () => {
    renderPicker();

    const first = card("feie-fp-n20w");
    expect(within(first).getByText("Connects by")).toBeInTheDocument();
    const width = within(first).getByText("Labels up to");
    expect(width.closest("details")).toBeNull();
  });

  it("marks the recommended printer and lists it first", () => {
    renderPicker();

    const first = document.querySelector<HTMLElement>(
      "[data-printer]",
    ) as HTMLElement;
    expect(within(first).getByText("Recommended")).toBeInTheDocument();
  });

  it("avoids connector jargon in card copy", () => {
    renderPicker();
    expect(document.body.textContent).not.toMatch(/connector|brand-cloud/i);
  });

  it.each([["Works with iPad alone"], ["Needs a helper device"]])(
    "keeps the %s badge and its info button on one line",
    (badge) => {
      renderPicker();
      fireEvent.click(
        screen.getByRole("button", { name: "Works with iPad alone" }),
      );

      const cards = Array.from(
        document.querySelectorAll<HTMLElement>("[data-printer]"),
      );
      const pairs = cards.flatMap((element) =>
        within(element)
          .queryAllByText(badge, { selector: "[data-slot=badge]" })
          .map((found) => ({ element, found })),
      );
      expect(pairs.length).toBeGreaterThan(0);
      for (const { found } of pairs) {
        const group = found.parentElement as HTMLElement;
        expect(group).toHaveClass("inline-flex");
        expect(
          within(group).getByRole("button", {
            name: `What does "${badge}" mean?`,
          }),
        ).toBeInTheDocument();
        expect(group.querySelectorAll("[data-slot=badge]")).toHaveLength(1);
      }
    },
  );
});
