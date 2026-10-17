import type { ReactNode } from "react";

/** A numbered sequence a vendor works through in order. */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="space-y-6">{children}</ol>;
}

export function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="border-primary/40 text-primary mt-px flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}
