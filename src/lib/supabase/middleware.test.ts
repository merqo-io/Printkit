import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { getUser, createServerClient } = vi.hoisted(() => {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } });
  const createServerClient = vi.fn();
  return { getUser, createServerClient };
});
vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    createServerClient.mockImplementation(() => ({ auth: { getUser } }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes through an unprotected path without checking auth", async () => {
    const request = new NextRequest("https://printkit.merqo.io/login");

    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("allows an authenticated user through on a protected path", async () => {
    const request = new NextRequest("https://printkit.merqo.io/dashboard");

    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalled();
  });

  it("redirects to /login when there is no authenticated user on a protected path", async () => {
    createServerClient.mockImplementation(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    }));
    const request = new NextRequest("https://printkit.merqo.io/dashboard");

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://printkit.merqo.io/login",
    );
  });

  it("records a signed-out deep link as next on the /login redirect", async () => {
    createServerClient.mockImplementation(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    }));
    const request = new NextRequest(
      "https://printkit.merqo.io/dashboard/printers/new?location=loc-1",
    );

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe(
      "https://printkit.merqo.io/login",
    );
    expect([...location.searchParams.keys()]).toEqual(["next"]);
    expect(location.searchParams.get("next")).toBe(
      "/dashboard/printers/new?location=loc-1",
    );
  });

  it("redirects to /login when getUser throws", async () => {
    createServerClient.mockImplementation(() => ({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("network error")),
      },
    }));
    const request = new NextRequest("https://printkit.merqo.io/dashboard");

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://printkit.merqo.io/login",
    );
  });
});

describe("updateSession: host-only duplicate auth cookie cleanup", () => {
  const DUPLICATED =
    "sb-project-auth-token=host-only; sb-project-auth-token=domain";
  const request = (path: string, cookie: string) =>
    new NextRequest(`https://printkit.merqo.io${path}`, {
      headers: { cookie },
    });
  const cleared = (
    response: {
      cookies: {
        getAll: () => { name: string; value: string; maxAge?: number }[];
      };
    },
    name: string,
  ) => response.cookies.getAll().find((c) => c.name === name);

  beforeEach(() => {
    process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN = ".merqo.io";
    createServerClient.mockImplementation(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
    }));
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
    vi.clearAllMocks();
  });

  it("clears the host-only copy when the browser sends the same auth cookie twice", async () => {
    const response = await updateSession(request("/dashboard", DUPLICATED));
    expect(cleared(response, "sb-project-auth-token")?.maxAge).toBe(0);
  });

  it("clears on a public path too, where no user is resolved", async () => {
    const response = await updateSession(request("/login", DUPLICATED));
    expect(cleared(response, "sb-project-auth-token")?.maxAge).toBe(0);
  });

  it("clears chunked token names", async () => {
    const response = await updateSession(
      request(
        "/dashboard",
        "sb-project-auth-token.0=a; sb-project-auth-token.0=b; sb-project-auth-token.1=a; sb-project-auth-token.1=b",
      ),
    );
    expect(cleared(response, "sb-project-auth-token.0")?.maxAge).toBe(0);
    expect(cleared(response, "sb-project-auth-token.1")?.maxAge).toBe(0);
  });

  it("clears again on every request while the duplicate exists", async () => {
    const first = await updateSession(request("/dashboard", DUPLICATED));
    const second = await updateSession(request("/dashboard", DUPLICATED));
    expect(cleared(first, "sb-project-auth-token")?.maxAge).toBe(0);
    expect(cleared(second, "sb-project-auth-token")?.maxAge).toBe(0);
  });

  it("leaves a single auth cookie alone", async () => {
    const response = await updateSession(
      request("/dashboard", "sb-project-auth-token=only-one"),
    );
    expect(cleared(response, "sb-project-auth-token")).toBeUndefined();
  });

  it("does nothing when NEXT_PUBLIC_AUTH_COOKIE_DOMAIN is unset", async () => {
    delete process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
    const response = await updateSession(request("/dashboard", DUPLICATED));
    expect(cleared(response, "sb-project-auth-token")).toBeUndefined();
  });

  it("does not clobber a same-request token refresh", async () => {
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: vi.fn().mockImplementation(async () => {
          options.cookies.setAll([
            {
              name: "sb-project-auth-token",
              value: "freshly-refreshed",
              options: {},
            },
          ]);
          return { data: { user: { id: "u1" } } };
        }),
      },
    }));
    const response = await updateSession(request("/dashboard", DUPLICATED));
    expect(cleared(response, "sb-project-auth-token")?.value).toBe(
      "freshly-refreshed",
    );
  });
});
