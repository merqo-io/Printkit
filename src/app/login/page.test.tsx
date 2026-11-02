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
  resetPasswordForEmailMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
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

  it("shows the Supabase error and stays on the page when password sign-in is rejected", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const push = vi.fn();
    useRouterMock.mockReturnValue({ push, refresh: vi.fn() });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "vendor@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid login credentials",
    );
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("sends a reset email from Forgot password", async () => {
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
          redirectTo: `${window.location.origin}/auth/callback`,
        }),
      );
    });
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

  it("points new vendors to qkit instead of offering sign-up", () => {
    render(<LoginPage />);

    expect(
      screen.queryByRole("button", { name: /create an account/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/print companion for qkit booths/i)).toBeVisible();
  });
});

describe("LoginPage return path", () => {
  const DEEP_LINK = "/dashboard/printers/new?location=loc-1";
  let cookieWrites: string[];

  beforeEach(() => {
    cookieWrites = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
      cookieWrites.push(value);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  function savedNext(): string | null {
    const write = cookieWrites.findLast((c) =>
      c.startsWith("printkit_auth_next="),
    );
    if (!write) return null;
    expect(write).toMatch(/Path=\/auth/);
    expect(write).toMatch(/SameSite=Lax/);
    if (/Max-Age=0;/.test(write)) return null;
    expect(write).toMatch(/Max-Age=600/);
    return decodeURIComponent(write.split(";")[0]!.split("=")[1]!);
  }

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

  it("sends the bare callback URL to Google and saves next in a cookie", async () => {
    withNext(DEEP_LINK);

    const redirectTo = await googleRedirectTo();

    expect(redirectTo.toString()).toBe(
      `${window.location.origin}/auth/callback`,
    );
    expect(savedNext()).toBe(DEEP_LINK);
  });

  it("clears any saved next when there is none", async () => {
    const redirectTo = await googleRedirectTo();

    expect(redirectTo.search).toBe("");
    expect(cookieWrites.some((c) => c.startsWith("printkit_auth_next="))).toBe(
      true,
    );
    expect(savedNext()).toBeNull();
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
      expect(savedNext()).toBeNull();
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

      expect(redirectTo.search).toBe("");
      expect(redirectTo.hash).toBe("");
      expect(savedNext()).toBe("/dashboard/printers#booth-loc-1");
    });

    it("drops the fragment when next is unsafe", async () => {
      withNext("//evil.example/dashboard");

      const push = await signInWithPassword();

      expect(push).toHaveBeenCalledWith("/dashboard");
    });
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
