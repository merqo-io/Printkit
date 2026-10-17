import type { Metadata } from "next";
import Link from "next/link";
import { getVendorSession } from "@/lib/vendor-session";
import { listPrintHistoryPage } from "@/lib/print-history";
import { listActiveLocations } from "@/lib/print-locations";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { TextLink } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { JobHistoryTable } from "./job-history-table";

export const metadata: Metadata = {
  title: "History",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ unrouted?: string; cursor?: string }>;
}) {
  const [{ supabase, user }, params] = await Promise.all([
    getVendorSession(),
    searchParams,
  ]);
  const unrouted = params.unrouted === "1";
  const [{ jobs, nextCursor }, locations] = await Promise.all([
    listPrintHistoryPage(supabase, user.id, {
      unrouted,
      cursor: params.cursor,
    }),
    listActiveLocations(user.id),
  ]);
  const next = new URLSearchParams();
  if (unrouted) next.set("unrouted", "1");
  if (nextCursor) next.set("cursor", nextCursor);

  let emptyMessage: string | undefined;
  if (unrouted) emptyMessage = "No unrouted jobs. Every job has a booth.";
  else if (params.cursor) emptyMessage = "No older jobs.";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="History"
        description="Every label job, most recent first."
      />
      {unrouted && (
        <Notice tone="info" className="mb-4">
          <p>
            Showing only jobs that need a booth assigned.{" "}
            <TextLink href="/dashboard/history">Show all jobs</TextLink>
          </p>
        </Notice>
      )}
      <JobHistoryTable
        jobs={jobs}
        locations={locations}
        emptyMessage={emptyMessage}
      />
      {(params.cursor || nextCursor) && (
        <nav
          aria-label="Print history pages"
          className="mt-6 flex flex-wrap gap-3"
        >
          {params.cursor && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  unrouted
                    ? "/dashboard/history?unrouted=1"
                    : "/dashboard/history"
                }
              >
                Newest jobs
              </Link>
            </Button>
          )}
          {nextCursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={"/dashboard/history?" + next.toString()}>
                Older jobs
              </Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
