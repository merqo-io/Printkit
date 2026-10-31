// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const cookieValue = vi.hoisted(() => ({
  current: undefined as string | undefined,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "ui-states-fail" && cookieValue.current !== undefined
        ? { name, value: cookieValue.current }
        : undefined,
  })),
}));

import UiStatesLayout from "./layout";
import UnroutedPreviewPage from "./unrouted/page";
import ErrorPreviewPage from "./error/page";

describe("dev ui-states", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    cookieValue.current = undefined;
  });

  it("returns 404 in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => UiStatesLayout({ children: null })).toThrow("NEXT_NOT_FOUND");
  });

  it("renders its children outside production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    render(<UiStatesLayout>child</UiStatesLayout>);
    expect(screen.getByTestId("ui-states-frame")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("shows the unrouted notice for one and for many jobs", () => {
    render(<UnroutedPreviewPage />);
    expect(screen.getByTestId("unrouted-one")).toHaveTextContent(
      "Needs a booth (1) This order has no booth yet, so it did not print. Choose a booth for it.",
    );
    expect(screen.getByTestId("unrouted-many")).toHaveTextContent(
      "Needs a booth (3) These orders have no booth yet, so they did not print. Choose a booth for each.",
    );
  });

  it("throws while the fail cookie is set", async () => {
    cookieValue.current = "1";
    await expect(ErrorPreviewPage()).rejects.toThrow(
      "simulated server render failure",
    );
  });

  it("renders once the fail cookie is cleared", async () => {
    cookieValue.current = "0";
    render(await ErrorPreviewPage());
    expect(screen.getByTestId("ui-states-recovered")).toBeInTheDocument();
  });
});
