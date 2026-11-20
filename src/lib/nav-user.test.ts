import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const getOrCreateVendorProfile = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/merqo-vendor-profile", () => ({ getOrCreateVendorProfile }));

import { getNavUser } from "./nav-user";

const authUser = {
  id: "u1",
  email: "ada@example.com",
  user_metadata: { full_name: "Ada Auth" },
};

beforeEach(() => {
  getUser.mockReset();
  getOrCreateVendorProfile.mockReset();
});

describe("getNavUser", () => {
  it("is null when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getNavUser()).toBeNull();
    expect(getOrCreateVendorProfile).not.toHaveBeenCalled();
  });

  it("prefers the vendor stall name", async () => {
    getUser.mockResolvedValue({ data: { user: authUser } });
    getOrCreateVendorProfile.mockResolvedValue({ stall_name: "Ada's Stall" });
    expect(await getNavUser()).toMatchObject({ name: "Ada's Stall" });
  });

  it("falls back to the auth name when the profile read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getUser.mockResolvedValue({ data: { user: authUser } });
    getOrCreateVendorProfile.mockRejectedValue(new Error("down"));
    expect(await getNavUser()).toMatchObject({ name: "Ada Auth" });
  });

  it("falls back to the auth name when the stall name is blank", async () => {
    getUser.mockResolvedValue({ data: { user: authUser } });
    getOrCreateVendorProfile.mockResolvedValue({ stall_name: "" });
    expect(await getNavUser()).toMatchObject({ name: "Ada Auth" });
  });
});
