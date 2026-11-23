import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { robots: { index: false } };

/**
 * A segment's not-found.tsx only catches notFound() thrown inside that
 * segment; an unmatched URL would fall through to the root one and lose the
 * dashboard shell. This catch-all matches only URLs no real route claims,
 * so it throws from inside /dashboard and keeps the nav and header.
 */
export default function DashboardUnknownRoute(): never {
  notFound();
}
