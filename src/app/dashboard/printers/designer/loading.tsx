import { Skeleton } from "@merqo/ui/primitives";

/** Holds the Designer page's shape while the server reads its data. */
export default function DesignerLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-6xl">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
