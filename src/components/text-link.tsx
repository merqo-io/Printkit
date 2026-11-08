import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@merqo/ui/primitives";

/**
 * The one inline link style: accent colour, an offset underline that firms up
 * on hover and a visible focus ring so keyboard users can see where they are.
 */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-primary decoration-primary/40 hover:decoration-primary focus-visible:ring-ring/60 rounded-sm font-medium underline underline-offset-4 transition-colors outline-none focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}
