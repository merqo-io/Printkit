import { ListSkeleton } from "@merqo/ui";
import { Skeleton } from "@merqo/ui/primitives";

/** Holds the Printers page's shape while the server reads its data. */
export default function PrintersLoading() {
  return (
    <div className="mx-auto max-w-lg md:max-w-4xl">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <ListSkeleton rows={3} className="mt-8" />
    </div>
  );
}
