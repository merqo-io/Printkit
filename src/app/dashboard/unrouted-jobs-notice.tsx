import { Notice } from "@/components/notice";
import { TextLink } from "@/components/text-link";

/** Overview callout for jobs that arrived without a booth to print at. */
export function UnroutedJobsNotice({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Notice tone="warning">
      <p>
        <TextLink href="/dashboard/history?unrouted=1">
          {count} unrouted print job{count === 1 ? "" : "s"}
        </TextLink>{" "}
        {count === 1
          ? "needs a booth assigned before it can print."
          : "need a booth assigned before they can print."}
      </p>
    </Notice>
  );
}
