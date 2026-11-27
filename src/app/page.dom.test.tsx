// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { redirectMock, getUserMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  getUserMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser: getUserMock } }),
}));

import Home, { metadata } from "./page";

describe("Home", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    getUserMock.mockReset();
  });

  it("renders the landing for a signed-out visitor", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    render(await Home());
    expect(redirectMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Print qkit orders on a Bluetooth printer.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /^Sign in/ })[0],
    ).toHaveAttribute("href", "/login");
  });

  it("sends a signed-in vendor to /dashboard", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("lifts noindex for the root page only", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });
});
