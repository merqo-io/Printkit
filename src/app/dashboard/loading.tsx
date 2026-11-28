import { ListSkeleton } from "@merqo/ui";
import { Skeleton } from "@merqo/ui/primitives";

/** Holds the page's shape while the server reads printers and jobs. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-lg md:max-w-4xl">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <ListSkeleton rows={2} className="mt-8" />
    </div>
  );
}
