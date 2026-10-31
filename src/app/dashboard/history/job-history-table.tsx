import { DataTable, type DataTableColumn } from "@merqo/ui";
import { JobStatusBadge } from "../job-status-badge";
import { ReprintButton } from "./reprint-button";
import { AssignLocationControl } from "./assign-location-control";
import { failureReasonText } from "./failure-reason-copy";
import { formatDateTime } from "@/lib/utils";
import { payloadField } from "@/lib/print-job-payload";
import type { PrintJob } from "@/lib/print-jobs-list";

export function JobHistoryTable({
  jobs,
  locations = [],
  emptyMessage = "No print jobs yet. They show up here once qkit sends one.",
}: {
  jobs: PrintJob[];
  locations?: { id: string; label: string }[];
  emptyMessage?: string;
}) {
  if (jobs.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed px-5 py-10 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  const columns: DataTableColumn<PrintJob>[] = [
    {
      header: "Customer",
      cell: (job) => payloadField(job.payload, "customer_name"),
    },
    {
      header: "Order #",
      cell: (job) => payloadField(job.payload, "order_number"),
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
        job.status === "failed" || job.status === "printed" ? (
          <ReprintButton
            jobId={job.id}
            boothLabel={job.print_locations?.label}
          />
        ) : null,
    },
  ];
  return (
    <DataTable rows={jobs} columns={columns} getRowKey={(job) => job.id} />
  );
}
