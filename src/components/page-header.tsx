import type { ReactNode } from "react";
import { TextLink } from "@/components/text-link";

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
        <p className="mb-3 text-sm">
          <TextLink href={back.href}>{back.label}</TextLink>
        </p>
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
