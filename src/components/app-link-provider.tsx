"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppLinkProvider } from "@merqo/ui";

// next/link is a function, so it cannot cross from a Server Component into a
// client export as a prop; the provider hands it over from the client side.
export function AppLinks({ children }: { children: ReactNode }) {
  return <AppLinkProvider component={Link}>{children}</AppLinkProvider>;
}
