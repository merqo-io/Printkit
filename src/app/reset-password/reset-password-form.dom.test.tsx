// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const { updatePasswordAction, push, refresh, toast } = vi.hoisted(() => ({
  updatePasswordAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("./actions", () => ({ updatePasswordAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("sonner", () => ({ toast }));
import { ResetPasswordForm } from "./reset-password-form";

beforeEach(() => {
  vi.clearAllMocks();
  updatePasswordAction.mockResolvedValue({ success: true });
});

async function enterPasswords(
  password = "new-password-123",
  confirm = password,
) {
  fireEvent.change(await screen.findByLabelText("New password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirm },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
}

describe("password recovery", () => {
  it("shows the expired card, never the form, without a recovery window", () => {
    render(<ResetPasswordForm initialState="expired" />);
    expect(
      screen.getByRole("heading", { name: "This link has expired" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to sign in" }),
    ).toHaveAttribute("href", "/login");
  });

  it("shows a recoverable error when the session could not be checked", () => {
    render(<ResetPasswordForm initialState="failed" />);
    expect(
      screen.getByText(/could not check your reset link/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("rejects mismatched passwords before the server", async () => {
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords("long-password", "different-password");
    expect(updatePasswordAction).not.toHaveBeenCalled();
    expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
  });

  it("blocks short passwords before the server", async () => {
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords("short");
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 8/);
    expect(updatePasswordAction).not.toHaveBeenCalled();
  });

  it("shows update errors and permits a retry without redirecting", async () => {
    updatePasswordAction.mockResolvedValue({
      success: false,
      error: "Password is too weak",
    });
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Password is too weak"),
    );
    expect(push).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled();
  });

  it("switches to the expired card when the server finds the window closed", async () => {
    updatePasswordAction.mockResolvedValue({
      success: false,
      expired: true,
      error: "This reset link has expired.",
    });
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords();
    expect(
      await screen.findByRole("heading", { name: "This link has expired" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("updates the password before routing to the dashboard", async () => {
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(updatePasswordAction).toHaveBeenCalledWith({
      password: "new-password-123",
      confirm: "new-password-123",
    });
    expect(toast.success).toHaveBeenCalledWith("Password updated");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("recovers controls after the action rejects", async () => {
    updatePasswordAction.mockRejectedValue(new Error("network"));
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not update your password. Please try again.",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("prevents duplicate updates while the request is pending", async () => {
    let resolve!: (result: { success: true }) => void;
    updatePasswordAction.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<ResetPasswordForm initialState="ready" />);
    await enterPasswords();
    expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Updating…" }));
    expect(updatePasswordAction).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ success: true }));
  });
});
