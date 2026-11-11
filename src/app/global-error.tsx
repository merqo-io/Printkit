"use client";

import { GlobalError } from "@merqo/ui";

/** Fallback when the root layout itself throws, before any stylesheet loads. */
export default function GlobalErrorPage({ retry }: { retry: () => void }) {
  return (
    <GlobalError
      reset={retry}
      colors={{
        background: "oklch(0.97 0.006 90)",
        foreground: "oklch(0.2 0.01 280)",
        mutedForeground: "oklch(0.48 0.01 90)",
        primary: "oklch(0.24 0.01 280)",
        primaryForeground: "oklch(0.97 0.006 90)",
      }}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      radius="0.625rem"
    />
  );
}
