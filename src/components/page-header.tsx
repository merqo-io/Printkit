import type { ReactNode } from "react";
import Link from "next/link";
import { BackButton } from "@merqo/ui";

/**
 * The top of every dashboard page: an optional way back, the title in the
 * family display face, and a sentence saying what the page is for.
 */
export function PageHeader({
  title,
  description,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8">
      {back && (
        <div className="mb-3 -ml-3">
          <BackButton
            href={back.href}
            label={back.label}
            LinkComponent={Link}
          />
        </div>
      )}
      <h1 className="font-display text-3xl leading-tight font-semibold text-balance">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          {description}
        </p>
      )}
    </header>
  );
}
