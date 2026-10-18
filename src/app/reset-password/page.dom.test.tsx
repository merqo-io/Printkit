// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { cookieGet, getClaims } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  getClaims: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getClaims } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./actions", () => ({ updatePasswordAction: vi.fn() }));

import { mintRecoveryWindow } from "@/lib/recovery-window";
import ResetPasswordPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");
  getClaims.mockResolvedValue({
    data: { claims: { session_id: "session-1" } },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("ResetPasswordPage", () => {
  it("refuses a plain signed-in session and points to a fresh reset link", async () => {
    cookieGet.mockReturnValue(undefined);
    render(await ResetPasswordPage());
    expect(
      screen.getByRole("heading", { name: "This link has expired" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to sign in" }),
    ).toHaveAttribute("href", "/login");
  });

  it("shows the form to a session holding its recovery window", async () => {
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("session-1") });
    render(await ResetPasswordPage());
    expect(
      screen.getByRole("heading", { name: "Set a new password" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("shows the expired card to a signed-out visitor", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    cookieGet.mockReturnValue({ value: mintRecoveryWindow("session-1") });
    render(await ResetPasswordPage());
    expect(
      screen.getByRole("heading", { name: "This link has expired" }),
    ).toBeInTheDocument();
  });

  it("shows a recoverable error when the session cannot be checked", async () => {
    getClaims.mockResolvedValue({
      data: null,
      error: { message: "Auth unavailable" },
    });
    render(await ResetPasswordPage());
    expect(
      screen.getByRole("heading", { name: "Could not check your reset link" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});
