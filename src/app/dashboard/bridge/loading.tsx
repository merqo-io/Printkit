import { ListSkeleton } from "@merqo/ui";
import { Skeleton } from "@merqo/ui/primitives";

/** Holds the Bridge page's shape while the server reads its data. */
export default function BridgeLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <ListSkeleton rows={2} className="mt-8" />
    </div>
  );
}
