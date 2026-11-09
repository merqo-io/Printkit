import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@merqo/ui/primitives";

/** The bordered container dashboard content sits in. Never nest one. */
export function Panel({
  as: As = "div",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "li";
  children: ReactNode;
}) {
  return (
    <As className={cn("bg-card rounded-xl border p-5", className)} {...props}>
      {children}
    </As>
  );
}
