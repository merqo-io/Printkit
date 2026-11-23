import { expect, it, vi } from "vitest";

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));

import DashboardUnknownRoute from "./page";

it("throws notFound so the dashboard not-found renders inside the layout", () => {
  expect(() => DashboardUnknownRoute()).toThrow("NEXT_NOT_FOUND");
  expect(notFound).toHaveBeenCalledOnce();
});
