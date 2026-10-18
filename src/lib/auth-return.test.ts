import { describe, expect, it } from "vitest";
import { authNextCookie } from "./auth-return";

describe("authNextCookie", () => {
  it("saves an encoded next for ten minutes under /auth", () => {
    expect(authNextCookie("/dashboard/bridge?booth=1#row", true)).toBe(
      "printkit_auth_next=%2Fdashboard%2Fbridge%3Fbooth%3D1%23row; Path=/auth; Max-Age=600; SameSite=Lax; Secure",
    );
  });

  it("clears the cookie for a null next", () => {
    expect(authNextCookie(null, true)).toBe(
      "printkit_auth_next=; Path=/auth; Max-Age=0; SameSite=Lax; Secure",
    );
  });

  it("omits Secure on a plain-http dev origin", () => {
    expect(authNextCookie("/dashboard", false)).not.toMatch(/Secure/);
  });
});
