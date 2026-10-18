import type { Metadata } from "next";
import { describe, it, expect } from "vitest";

type MetadataModule = { metadata?: Metadata };

const PAGES: [string, () => Promise<MetadataModule>, string][] = [
  ["/dashboard", () => import("./dashboard/page"), "Overview"],
  [
    "/dashboard/printers",
    () => import("./dashboard/printers/page"),
    "Printers",
  ],
  [
    "/dashboard/printers/new",
    () => import("./dashboard/printers/new/page"),
    "Choose a printer",
  ],
  [
    "/dashboard/printers/setup",
    () => import("./dashboard/printers/setup/page"),
    "Set up a printer",
  ],
  ["/dashboard/history", () => import("./dashboard/history/page"), "History"],
  ["/dashboard/bridge", () => import("./dashboard/bridge/page"), "Bridge mode"],
  [
    "/dashboard/dev/virtual-printer",
    () => import("./dashboard/dev/virtual-printer/page"),
    "Virtual printer",
  ],
  [
    "/dev/ui-states/unrouted",
    () => import("./dev/ui-states/unrouted/page"),
    "Unrouted jobs preview",
  ],
  [
    "/dev/ui-states/error",
    () => import("./dev/ui-states/error/page"),
    "Error page preview",
  ],
  ["/about", () => import("./about/page"), "About"],
  ["/login", () => import("./login/layout"), "Sign in"],
  [
    "/reset-password",
    () => import("./reset-password/page"),
    "Set a new password",
  ],
  [
    "/legal/accept",
    () => import("./legal/accept/page"),
    "Accept the updated terms",
  ],
  ["/legal/terms", () => import("./legal/terms/page"), "Terms of Service"],
  ["/legal/privacy", () => import("./legal/privacy/page"), "Privacy Policy"],
  [
    "/guides/bluetooth-printers",
    () => import("./guides/bluetooth-printers/page"),
    "Bluetooth printers",
  ],
];

describe("page titles", () => {
  it.each(PAGES)("%s has its own title", async (_route, load, title) => {
    const { metadata } = await load();
    expect(metadata?.title).toBe(title);
  });
});
