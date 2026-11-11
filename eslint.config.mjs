import next from "eslint-config-next";
import sonarjs from "eslint-plugin-sonarjs";
import { merqoEslintPreset, merqoNoLocalCopies } from "@merqo/ui/eslint";

const tsPlugin = next.find((c) => c.plugins?.["@typescript-eslint"]).plugins[
  "@typescript-eslint"
];

const eslintConfig = [
  ...next,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "sonarjs/no-unused-vars": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "supabase/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      ".stryker-tmp/**",
      "reports/**",
      // Nested git worktrees (.claude/worktrees/<name>/) are separate
      // checkouts with their own node_modules/.next/etc — the globs above
      // are root-anchored (gitignore semantics) and don't reach into them.
      "**/.claude/worktrees/**",
      // Harness re-sync merge-base snapshot: a byte-for-byte mirror of the
      // seeded hook scripts. Linting it too would double every finding and
      // risks eslint --fix rewriting it out of sync with harness.json's
      // recorded hash — same reasoning as the pre-commit format-lint
      // exclusion in .husky/lib/pre-commit.sh.
      ".claude/.harness-base/**",
    ],
  },
  sonarjs.configs.recommended,
  {
    // Generated shadcn primitives: not this repo's code to restructure.
    files: ["src/components/ui/**"],
    rules: { "sonarjs/prefer-read-only-props": "off" },
  },
  ...merqoEslintPreset({
    sonarjsPlugin: sonarjs.configs.recommended.plugins.sonarjs,
    tsPlugin,
  }),
  // Supabase, rate-limit, kit-auth, kit-callback and legal-gate wrap the
  // shared piece with printkit's schema, tables and env. brand-icon keeps the
  // magenta registration dot; segmented-control is link-based, while the
  // shared one is a button radio group. error-page also exempts
  // src/app/dashboard/error.tsx: that boundary renders inside the dashboard
  // layout, and the shared page is a full-screen card.
  ...merqoNoLocalCopies({
    allow: [
      "supabase-client",
      "supabase-server",
      "supabase-middleware",
      "rate-limit",
      "kit-auth",
      "kit-callback",
      "legal-gate",
      "brand-icon",
      "segmented-control",
      "error-page",
    ],
  }),
  {
    // The service client bypasses RLS: keep it in lib helpers and bearer-gated
    // route handlers. A Server Action that needs it states why on the import.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/**", "src/app/api/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/server",
              importNames: ["createServiceClient"],
              message:
                "Service-role client bypasses RLS. Use it only in src/lib or src/app/api, or justify with an eslint-disable description.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
