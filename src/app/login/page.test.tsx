// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LoginPage from "./page";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  useSearchParamsMock,
  useRouterMock,
  signInWithOAuthMock,
  signInWithPasswordMock,
  signUpMock,
  resetPasswordForEmailMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signUpMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

beforeEach(() => {
  useRouterMock.mockReset().mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn(),
  });
  useSearchParamsMock.mockReset().mockReturnValue(new URLSearchParams());
  signInWithOAuthMock.mockReset().mockResolvedValue({ error: null });
  signInWithPasswordMock.mockReset().mockResolvedValue({ error: null });
  signUpMock
    .mockReset()
    .mockResolvedValue({ data: { session: {} }, error: null });
  resetPasswordForEmailMock.mockReset().mockResolvedValue({ error: null });
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("LoginPage", () => {
  it("shows an error message when the URL has ?error=oauth", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("error=oauth"));
    render(<LoginPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "Something went wrong signing in with Google. Please try again.",
    );
  });

  it("does not show an error message when there is no error param", async () => {
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("requests an English consent screen when signing in with Google", async () => {
    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: "google",
      options: expect.objectContaining({ queryParams: { hl: "en" } }),
    });
  });

  it("shows a check-your-email state instead of redirecting when signUp returns no session", async () => {
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    const push = vi.fn();
    useRouterMock.mockReturnValue({ push, refresh: vi.fn() });

    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/new@example\.com/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard when signUp returns a session", async () => {
    const push = vi.fn();
    const refresh = vi.fn();
    useRouterMock.mockReturnValue({ push, refresh });

    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  it("shows Forgot password only in signin mode and sends a reset email", async () => {
    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /forgot password/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), "vendor@example.com");
    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
        "vendor@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/reset-password"),
        }),
      );
    });

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    expect(
      screen.queryByRole("button", { name: /forgot password/i }),
    ).not.toBeInTheDocument();
  });

  it("toasts an error and does not send a reset email when the email field is empty", async () => {
    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    expect(toast.error).toHaveBeenCalledWith("Enter your email first");
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });

  it("toasts the Supabase error message when resetPasswordForEmail fails", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: { message: "Too many requests" },
    });
    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "vendor@example.com");
    await user.click(screen.getByRole("button", { name: /forgot password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Too many requests");
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("returns to the sign-in form from the check-your-email state via Back to sign in", async () => {
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup();
    const { default: LoginPage } = await import("./page");
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /back to sign in/i }));

    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /welcome back/i }),
    ).toBeInTheDocument();
  });
});

describe("LoginPage return path", () => {
  const DEEP_LINK = "/dashboard/printers/new?location=loc-1";

  function withNext(next: string) {
    useSearchParamsMock.mockReturnValue(new URLSearchParams({ next }));
  }

  async function signInWithPassword() {
    const push = vi.fn();
    useRouterMock.mockReturnValue({ push, refresh: vi.fn() });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "vendor@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    return push;
  }

  async function googleRedirectTo(): Promise<URL> {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );
    return new URL(signInWithOAuthMock.mock.calls[0][0].options.redirectTo);
  }

  it("returns to a valid next after password sign-in", async () => {
    withNext(DEEP_LINK);

    const push = await signInWithPassword();

    expect(push).toHaveBeenCalledWith(DEEP_LINK);
  });

  it("carries a valid next through the Google callback URL", async () => {
    withNext(DEEP_LINK);

    const redirectTo = await googleRedirectTo();

    expect(redirectTo.pathname).toBe("/auth/callback");
    expect(redirectTo.searchParams.get("next")).toBe(DEEP_LINK);
  });

  const UNSAFE_NEXT = [
    ["an absolute URL", "https://evil.example/dashboard"],
    ["a protocol-relative //host", "//evil.example/dashboard"],
    ["a backslash path", "/\\evil.example/dashboard"],
  ];

  it.each(UNSAFE_NEXT)(
    "falls back to /dashboard after password sign-in when next is %s",
    async (_label, next) => {
      withNext(next);

      const push = await signInWithPassword();

      expect(push).toHaveBeenCalledWith("/dashboard");
    },
  );

  it.each(UNSAFE_NEXT)(
    "sends no next to the Google callback when next is %s",
    async (_label, next) => {
      withNext(next);

      const redirectTo = await googleRedirectTo();

      expect(redirectTo.pathname).toBe("/auth/callback");
      expect(redirectTo.search).toBe("");
    },
  );

  describe("with a fragment on the login URL", () => {
    beforeEach(() => {
      window.location.hash = "#booth-loc-1";
    });
    afterEach(() => {
      window.location.hash = "";
    });

    it("puts the fragment back on next after password sign-in", async () => {
      withNext("/dashboard/printers");

      const push = await signInWithPassword();

      expect(push).toHaveBeenCalledWith("/dashboard/printers#booth-loc-1");
    });

    it("puts the fragment back on next for the Google callback", async () => {
      withNext("/dashboard/printers");

      const redirectTo = await googleRedirectTo();

      expect(redirectTo.searchParams.get("next")).toBe(
        "/dashboard/printers#booth-loc-1",
      );
      expect(redirectTo.hash).toBe("");
    });

    it("drops the fragment when next is unsafe", async () => {
      withNext("//evil.example/dashboard");

      const push = await signInWithPassword();

      expect(push).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("carries a valid next through the sign-up confirmation link", async () => {
    withNext(DEEP_LINK);
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(
      screen.getByRole("button", { name: /create an account/i }),
    );
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    const emailRedirectTo = new URL(
      signUpMock.mock.calls[0][0].options.emailRedirectTo,
    );
    expect(emailRedirectTo.pathname).toBe("/auth/callback");
    expect(emailRedirectTo.searchParams.get("next")).toBe(DEEP_LINK);
  });
});

it("releases reset controls after transport rejection", async () => {
  resetPasswordForEmailMock.mockRejectedValue(new Error("network"));
  const { default: LoginPage } = await import("./page");
  render(<LoginPage />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "vendor@example.com");
  await user.click(screen.getByRole("button", { name: /forgot password/i }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Could not send a reset link. Please try again.",
    ),
  );
  expect(
    screen.getByRole("button", { name: /forgot password/i }),
  ).toBeEnabled();
});
