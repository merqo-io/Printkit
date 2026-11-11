import { DataTable, EmptyState, type DataTableColumn } from "@merqo/ui";
import { JobStatusBadge } from "../job-status-badge";
import { JobHistoryCards } from "./job-history-cards";
import { ReprintButton } from "./reprint-button";
import { AssignLocationControl } from "./assign-location-control";
import { failureReasonText } from "./failure-reason-copy";
import { formatDateTime } from "@/lib/utils";
import { payloadField } from "@/lib/print-job-payload";
import { isTestPrint } from "@/lib/test-print";
import type { PrintJob } from "@/lib/print-jobs-list";

export function JobHistoryTable({
  jobs,
  locations = [],
  emptyMessage = "Each qkit order shows up here.",
}: {
  jobs: PrintJob[];
  locations?: { id: string; label: string }[];
  emptyMessage?: string;
}) {
  if (jobs.length === 0) {
    return <EmptyState title="No labels yet." description={emptyMessage} />;
  }

  const columns: DataTableColumn<PrintJob>[] = [
    {
      header: "Customer",
      cell: (job) =>
        isTestPrint(job.source_kit)
          ? "Test print"
          : payloadField(job.payload, "customer_name"),
    },
    {
      header: "Order #",
      cell: (job) =>
        isTestPrint(job.source_kit)
          ? "None"
          : payloadField(job.payload, "order_number"),
    },
    {
      header: "Booth",
      cell: (job) =>
        job.location_id === null ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Needs a booth</span>
            {job.status === "queued" && (
              <AssignLocationControl jobId={job.id} locations={locations} />
            )}
          </div>
        ) : (
          (job.print_locations?.label ?? "Needs a booth")
        ),
    },
    {
      header: "Status",
      cell: (job) => (
        <div className="space-y-1">
          <JobStatusBadge status={job.status} />
          {job.status === "failed" && (
            <p className="text-muted-foreground max-w-xs text-xs">
              {failureReasonText(job.failure_reason)}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Created",
      className: "text-muted-foreground text-sm",
      cell: (job) => formatDateTime(job.created_at),
    },
    {
      header: "Action",
      cell: (job) =>
        !isTestPrint(job.source_kit) &&
        (job.status === "failed" || job.status === "printed") ? (
          <ReprintButton
            jobId={job.id}
            boothLabel={job.print_locations?.label}
          />
        ) : null,
    },
  ];
  return (
    <>
      <div className="sm:hidden">
        <JobHistoryCards jobs={jobs} locations={locations} />
      </div>
      <div className="hidden sm:block">
        <DataTable rows={jobs} columns={columns} getRowKey={(job) => job.id} />
      </div>
    </>
  );
}
