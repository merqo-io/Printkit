// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }));
beforeEach(() => {
  vi.resetAllMocks();
  auth.signInWithOAuth.mockResolvedValue({ error: null });
  auth.signInWithPassword.mockResolvedValue({ error: null });
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import LoginPage from "./page";

describe("LoginPage", () => {
  it("renders a single top-level heading with the Google and email/password form", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Continue with Google/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});

function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "vendor@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
}
it("recovers OAuth controls after a rejected request and permits retry", async () => {
  auth.signInWithOAuth.mockRejectedValueOnce(new Error("offline"));
  render(<LoginPage />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not sign in with Google",
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() => expect(auth.signInWithOAuth).toHaveBeenCalledTimes(2));
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
});
it("recovers sign-in on unexpected rejection without losing entered credentials", async () => {
  auth.signInWithPassword.mockRejectedValueOnce(new Error("offline"));
  render(<LoginPage />);
  fillCredentials();
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Check your connection",
  );
  expect(screen.getByLabelText("Email")).toHaveValue("vendor@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledTimes(2));
});
it("keeps controls busy while successful sign-in navigates", async () => {
  render(<LoginPage />);
  fillCredentials();
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
  expect(screen.getByRole("button", { name: /Please wait/ })).toBeDisabled();
});
