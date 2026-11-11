"use client";

import Link from "next/link";
import { Button } from "@merqo/ui/primitives";
import { ErrorPage } from "@merqo/ui";

function report(error: Error) {
  console.error("Dashboard error boundary caught", error);
}

/** Error fallback for dashboard pages, shown inside the dashboard layout. */
export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Next's `retry` re-fetches the segment; `reset` only clears the error
  // state, so the shared page's reset slot gets `retry`.
  return (
    <ErrorPage
      error={error}
      reset={retry}
      onError={report}
      title="Something went wrong"
      description="We hit a snag loading this page. Try again, or head back to the overview if it keeps happening."
      actions={
        <Button asChild variant="outline" className="h-11 w-full rounded-xl">
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      }
    />
  );
}
