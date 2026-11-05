import { JobStatusBadge } from "../job-status-badge";
import { AssignLocationControl } from "./assign-location-control";
import { ReprintButton } from "./reprint-button";
import { failureReasonText } from "./failure-reason-copy";
import { formatDateTime } from "@/lib/utils";
import { payloadField } from "@/lib/print-job-payload";
import { isTestPrint } from "@/lib/test-print";
import type { PrintJob } from "@/lib/print-jobs-list";

/**
 * Phone layout for the label list: one flat card per label instead of a
 * six-column table that would scroll sideways at 375px.
 */
export function JobHistoryCards({
  jobs,
  locations,
}: {
  jobs: PrintJob[];
  locations: { id: string; label: string }[];
}) {
  return (
    <ul className="space-y-3" data-testid="history-cards">
      {jobs.map((job) => {
        const test = isTestPrint(job.source_kit);
        const booth = job.print_locations?.label;
        return (
          <li key={job.id} className="bg-card space-y-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {test
                    ? "Test print"
                    : payloadField(job.payload, "customer_name")}
                </p>
                <p className="text-muted-foreground font-mono text-sm">
                  {test
                    ? "None"
                    : `#${payloadField(job.payload, "order_number")}`}
                </p>
              </div>
              <JobStatusBadge status={job.status} />
            </div>
            {job.status === "failed" && (
              <p className="text-muted-foreground text-xs">
                {failureReasonText(job.failure_reason)}
              </p>
            )}
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{booth ?? "Needs a booth"}</span>
              <span className="font-mono text-xs">
                {formatDateTime(job.created_at)}
              </span>
            </div>
            {job.location_id === null && job.status === "queued" && (
              <AssignLocationControl jobId={job.id} locations={locations} />
            )}
            {!test && (job.status === "failed" || job.status === "printed") && (
              <ReprintButton jobId={job.id} boothLabel={booth} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
