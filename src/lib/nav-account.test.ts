import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser } }),
}));

import { getNavAccount, navAccount } from "./nav-account";

describe("navAccount", () => {
  it("prefers the full name and carries the avatar", () => {
    expect(
      navAccount({
        email: "ada@example.com",
        user_metadata: {
          full_name: " Ada Lovelace ",
          avatar_url: "https://x/a.png",
        },
      }),
    ).toEqual({ name: "Ada Lovelace", avatarUrl: "https://x/a.png" });
  });

  it("falls back to the email, then to Account", () => {
    expect(navAccount({ email: "ada@example.com" }).name).toBe(
      "ada@example.com",
    );
    expect(navAccount({ user_metadata: { full_name: 3 } }).name).toBe(
      "Account",
    );
    expect(
      navAccount({ user_metadata: { avatar_url: "" } }).avatarUrl,
    ).toBeUndefined();
  });
});

describe("getNavAccount", () => {
  beforeEach(() => getUser.mockReset());

  it("is undefined when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getNavAccount()).toBeUndefined();
  });

  it("derives the account from the signed-in user", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "ada@example.com", user_metadata: {} } },
    });
    expect(await getNavAccount()).toEqual({
      name: "ada@example.com",
      avatarUrl: undefined,
    });
  });
});
