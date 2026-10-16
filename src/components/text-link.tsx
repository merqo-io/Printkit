import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** The one inline link style: primary ink with a quiet underline. */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-primary decoration-primary/40 hover:decoration-primary focus-visible:ring-ring/50 rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}
