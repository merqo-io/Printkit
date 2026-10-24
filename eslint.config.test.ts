import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const ERROR = 2;

describe("eslint config", () => {
  it.each([
    "no-inline-comments",
    "sonarjs/no-commented-code",
    "eslint-comments/require-description",
    "max-lines",
    "no-restricted-syntax",
  ])("%s resolves to error for app source", async (rule) => {
    const config = await new ESLint().calculateConfigForFile(
      "src/app/page.tsx",
    );
    const setting = config.rules?.[rule];
    expect(Array.isArray(setting) ? setting[0] : setting).toBe(ERROR);
  });
});
