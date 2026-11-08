import Link from "next/link";
import { cn } from "@merqo/ui/primitives";

export type SegmentedOption = {
  label: string;
  href: string;
  selected: boolean;
};

/**
 * A small either/or switch made of links, so each choice is a real URL (deep
 * linkable, works without client JS). `aria-current` marks the active choice
 * for assistive tech; the 44px touch height only applies to coarse pointers.
 */
export function SegmentedControl({
  label,
  options,
  className,
}: {
  label: string;
  options: SegmentedOption[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "bg-muted inline-flex rounded-lg p-1 text-sm font-medium",
        className,
      )}
    >
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.selected ? "true" : undefined}
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-md px-3 whitespace-nowrap transition-colors pointer-coarse:h-11 pointer-coarse:px-4",
            "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
            option.selected
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
