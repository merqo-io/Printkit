import { Wordmark as KitWordmark } from "@merqo/ui";

/** printkit wordmark. PascalCase compound (Apple's -Kit-style precedent,
 *  matching qkit/loopkit's logo-mark convention) with a magenta accent
 *  on "Print" — this is the visual mark only; every other surface
 *  (titles, prose, docs, slugs) stays lowercase "printkit" per
 *  docs/business/2026-07-15-kit-brand-naming-convention.md.
 *  The shared shell always sets a size (default `text-xl`), so callers
 *  that sit inside a sized parent pass their own `text-*` class. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <KitWordmark className={className}>
      <span className="text-magenta-text">Print</span>Kit
    </KitWordmark>
  );
}
