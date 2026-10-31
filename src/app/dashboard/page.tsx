import type { Metadata } from "next";
import { getVendorSession } from "@/lib/vendor-session";
import { listPrintJobs, countUnroutedJobs } from "@/lib/print-jobs-list";
import { listLocationPrinterSummaries } from "@/lib/location-printer-summaries";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { PrinterStatusRow } from "@/components/printer-status-row";
import { TextLink } from "@/components/text-link";
import { JobHistoryTable } from "./history/job-history-table";
import { AutoRefresh } from "./auto-refresh";
import { FirstRunPanel } from "./first-run-panel";
import { UnroutedJobsNotice } from "./unrouted-jobs-notice";

const FIRST_RUN_JOB_WINDOW = 50;

export const metadata: Metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const { supabase, user } = await getVendorSession();
  const [jobs, printers, unroutedCount] = await Promise.all([
    listPrintJobs(supabase, user.id, FIRST_RUN_JOB_WINDOW),
    listLocationPrinterSummaries(user.id),
    countUnroutedJobs(user.id),
  ]);

  const recentJobs = jobs.slice(0, 5);
  const locations = printers.map(({ location }) => location);
  // A printed job may sit past the five shown, so look across the wider window.
  const progress = {
    hasBooth: locations.length > 0,
    hasPrinter: printers.some(({ printer }) => printer !== null),
    hasPrintedJob: jobs.some((job) => job.status === "printed"),
  };
  const qkitUrl = process.env.NEXT_PUBLIC_QKIT_URL;

  return (
    <div className="mx-auto max-w-4xl">
      <AutoRefresh />
      <PageHeader
        title="Overview"
        description="Whether each booth's printer is online, and the latest labels from qkit orders."
      />

      <div className="space-y-8">
        <UnroutedJobsNotice count={unroutedCount} />

        <FirstRunPanel progress={progress} qkitUrl={qkitUrl} />

        {locations.length > 0 && (
          <section aria-labelledby="booths-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="booths-heading" className="text-lg font-semibold">
                Booths
              </h2>
              <TextLink href="/dashboard/printers" className="text-sm">
                Manage printers
              </TextLink>
            </div>
            <Panel className="mt-3 divide-y p-0">
              {printers.map(({ location: loc, printer, state }) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <PrinterStatusRow
                    label={loc.label}
                    printerName={printer?.display_name ?? null}
                    state={state}
                    lastSeenAt={printer?.last_seen_at ?? null}
                  />
                  <TextLink
                    href={`/dashboard/printers/designer?location=${encodeURIComponent(loc.id)}`}
                    className="shrink-0 text-sm"
                  >
                    Design label
                  </TextLink>
                </div>
              ))}
            </Panel>
          </section>
        )}

        <section aria-labelledby="recent-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="recent-heading" className="text-lg font-semibold">
              Recent jobs
            </h2>
            <TextLink href="/dashboard/history" className="text-sm">
              View all
            </TextLink>
          </div>
          <div className="mt-3">
            <JobHistoryTable jobs={recentJobs} locations={locations} />
          </div>
        </section>
      </div>
    </div>
  );
}
