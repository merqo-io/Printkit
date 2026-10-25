import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, readTokens } from "../../test/color";

const css = readFileSync(path.join(__dirname, "globals.css"), "utf8");

const TEXT = 4.5;
const GRAPHIC = 3;

const surfaces = ["background", "card", "popover"];

const textPairs: [string, string][] = [
  ...surfaces.flatMap((s): [string, string][] => [
    ["foreground", s],
    ["muted-foreground", s],
    ["primary-text", s],
    ["magenta-text", s],
    ["success-text", s],
    ["warning-text", s],
    ["info-text", s],
    ["destructive", s],
  ]),
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["magenta-foreground", "magenta"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];

const graphicPairs: [string, string][] = [
  ["input", "background"],
  ["ring", "background"],
  ["magenta", "background"],
  ...[1, 2, 3, 4, 5].map((n): [string, string] => [`chart-${n}`, "background"]),
];

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("%s theme contrast", (_name, selector) => {
  const t = readTokens(css, selector);

  it.each(textPairs)("%s on %s clears 4.5:1", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(graphicPairs)("%s against %s clears 3:1", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(GRAPHIC);
  });
});
