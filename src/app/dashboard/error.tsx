"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";

/** Error fallback for dashboard pages, shown inside the dashboard layout. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary caught", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Something went wrong" />
      <Panel>
        <p className="text-muted-foreground text-sm">
          We hit a snag loading this page. Try again, or head back to the
          overview if it keeps happening.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
