// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "./hero";
import { PrintJourney } from "./print-journey";
import { LandingClosing, LandingFaq } from "./sections";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function renderLanding() {
  return render(
    <main>
      <Hero />
      <PrintJourney />
      <LandingFaq />
      <LandingClosing />
    </main>,
  );
}

describe("landing guardrails", () => {
  it("has no price, em dash or live claim", () => {
    stubReducedMotion(true);
    const { container } = renderLanding();
    const text = container.textContent ?? "";
    expect(text).not.toContain("$");
    expect(text).not.toContain("—");
    expect(text).not.toMatch(
      /\b(live|now|available today|proven|tiers?|pro|shopkit|reachkit)\b/i,
    );
  });

  it("says it is in build", () => {
    stubReducedMotion(true);
    renderLanding();
    expect(screen.getByText("In build")).toBeInTheDocument();
    expect(
      screen.getByText("Built, not yet tried with vendors."),
    ).toBeInTheDocument();
  });

  it("tells the journey in three steps and the FAQ in three rows", () => {
    stubReducedMotion(true);
    renderLanding();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(document.getElementById("how")).not.toBeNull();
    expect(document.querySelectorAll("[data-faq-row]")).toHaveLength(3);
  });

  it("links the Bluetooth guide", () => {
    stubReducedMotion(true);
    renderLanding();
    expect(
      screen.getByRole("link", { name: "Read the Bluetooth printer guide" }),
    ).toHaveAttribute("href", "/guides/bluetooth-printers");
  });

  it("shows the printed state at once under reduced motion", () => {
    stubReducedMotion(true);
    renderLanding();
    expect(screen.getAllByText("Printed").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Replay" })).toBeNull();
    expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
  });
});
