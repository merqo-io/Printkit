import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE = {
  neutral: "border-border bg-muted/60",
  info: "border-info/35 bg-info/10",
  warning: "border-warning/45 bg-warning/12",
} as const;

const TITLE_TONE = {
  neutral: "text-foreground",
  info: "text-info-text",
  warning: "text-warning-text",
} as const;

/** A callout that needs reading before the content around it. */
export function Notice({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONE;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 text-sm", TONE[tone], className)}>
      {title && <p className={cn("font-medium", TITLE_TONE[tone])}>{title}</p>}
      <div className={cn("text-muted-foreground space-y-2", title && "mt-1")}>
        {children}
      </div>
    </div>
  );
}
