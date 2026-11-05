import type { ReactNode } from "react";
import Link from "next/link";
import { BackButton } from "@merqo/ui";

/**
 * The top of every dashboard page: an optional way back, a small uppercase
 * eyebrow, the title in the family display face, a sentence saying what the
 * page is for and an optional action (usually one primary button). The props
 * (eyebrow, title, description, action) match the shape of the shared
 * PageHeader in the other kits so it can be swapped for a merqo-ui one.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-7">
      {back && (
        <div className="mb-3 -ml-3">
          <BackButton
            href={back.href}
            label={back.label}
            LinkComponent={Link}
          />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-[0.16em] uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-2 max-w-prose text-sm">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
