// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const accountNavProps = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction: vi.fn() }));
vi.mock("@/app/actions/landing-account", () => ({
  submitLandingSupportAction: vi.fn(),
}));

vi.mock("@merqo/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@merqo/ui")>()),
  LandingNav: ({ end }: { end: React.ReactNode }) => <header>{end}</header>,
  LandingAccountNav: (props: unknown) => {
    accountNavProps(props);
    return null;
  },
}));

import { SiteNav } from "./site-nav";

// SiteNav is a Server Component: a function prop such as next/link's
// server build cannot cross into the client LandingAccountNav.
it("passes no LinkComponent to the client account nav", () => {
  render(<SiteNav user={{ email: "a@b.co" } as never} />);
  expect(accountNavProps).toHaveBeenCalledTimes(1);
  expect(accountNavProps.mock.calls[0][0].LinkComponent).toBeUndefined();
});
