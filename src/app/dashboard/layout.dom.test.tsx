// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/vendor-session", () => ({
  getVendorSession: vi.fn().mockResolvedValue({
    supabase: {},
    user: { id: "vendor-1", email: "vendor@test.dev", user_metadata: {} },
  }),
}));
vi.mock("@/lib/merqo-vendor-profile", () => ({
  getOrCreateVendorProfile: vi
    .fn()
    .mockResolvedValue({ stall_name: "Ada's Prints" }),
}));
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("./dashboard-nav", () => ({
  DashboardNav: ({ accountName }: { accountName: string }) => (
    <div>{accountName}</div>
  ),
}));
vi.mock("@merqo/ui", async (importActual) => ({
  ...(await importActual<typeof import("@merqo/ui")>()),
  Footer: ({ kitName }: { kitName: string }) => (
    <footer>
      <span>© 2026 {kitName}</span>
      <a href="/legal/terms">Terms</a>
      <a href="/legal/privacy">Privacy</a>
    </footer>
  ),
}));

import DashboardLayout from "./layout";
import { getOrCreateVendorProfile } from "@/lib/merqo-vendor-profile";

describe("DashboardLayout", () => {
  it("renders the nav with the vendor's stall name and the page content", async () => {
    render(await DashboardLayout({ children: <p>page content</p> }));
    expect(screen.getByText("Ada's Prints")).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("shows the email local part, never the full email, for a blank stall name", async () => {
    vi.mocked(getOrCreateVendorProfile).mockResolvedValueOnce({
      stall_name: "  ",
    } as never);
    render(await DashboardLayout({ children: <p>page content</p> }));
    expect(screen.getByText("vendor")).toBeInTheDocument();
    expect(screen.queryByText("vendor@test.dev")).not.toBeInTheDocument();
  });

  it("uses the qkit main container rhythm", async () => {
    render(await DashboardLayout({ children: <p>page content</p> }));
    const main = screen.getByRole("main");
    expect(main).toHaveClass("mx-auto", "max-w-7xl", "px-5", "py-7");
    expect(main).not.toHaveClass("pb-16");
  });

  it("renders the shared family footer with the legal links", async () => {
    render(await DashboardLayout({ children: <p>page content</p> }));
    expect(screen.getByText("© 2026 printkit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });
});
