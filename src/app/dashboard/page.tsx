import { getVendorSession } from "@/lib/vendor-session";
import { listPrintJobs, countUnroutedJobs } from "@/lib/print-jobs-list";
import { listLocationPrinterSummaries } from "@/lib/location-printer-summaries";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { PrinterStatusRow } from "@/components/printer-status-row";
import { TextLink } from "@/components/text-link";
import { JobHistoryTable } from "./history/job-history-table";

export default async function DashboardPage() {
  const { supabase, user } = await getVendorSession();
  const [recentJobs, printers, unroutedCount] = await Promise.all([
    listPrintJobs(supabase, user.id, 5),
    listLocationPrinterSummaries(user.id),
    countUnroutedJobs(user.id),
  ]);

  const locations = printers.map(({ location }) => location);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Overview"
        description="Whether each booth's printer is online, and the latest labels from qkit orders."
      />

      <div className="space-y-8">
        {unroutedCount > 0 && (
          <Notice tone="warning">
            <p>
              <TextLink href="/dashboard/history?unrouted=1">
                {unroutedCount} unrouted print job
                {unroutedCount === 1 ? "" : "s"}
              </TextLink>{" "}
              need a booth assigned before they can print.
            </p>
          </Notice>
        )}

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
            {locations.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">
                No booths have printing enabled yet. Turn it on in qkit&apos;s
                booth settings.
              </p>
            ) : (
              printers.map(({ location: loc, printer, state }) => (
                <div key={loc.id} className="px-5 py-4">
                  <PrinterStatusRow
                    label={loc.label}
                    printerName={printer?.display_name ?? null}
                    state={state}
                    lastSeenAt={printer?.last_seen_at ?? null}
                  />
                </div>
              ))
            )}
          </Panel>
        </section>

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
