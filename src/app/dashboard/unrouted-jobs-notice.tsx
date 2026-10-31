import { Notice } from "@/components/notice";
import { TextLink } from "@/components/text-link";

/** Overview callout for orders that arrived without a booth to print at. */
export function UnroutedJobsNotice({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Notice tone="warning">
      <p>
        <TextLink href="/dashboard/history?unrouted=1">
          Needs a booth ({count})
        </TextLink>{" "}
        {count === 1
          ? "This order has no booth yet, so it did not print. Choose a booth for it."
          : "These orders have no booth yet, so they did not print. Choose a booth for each."}
      </p>
    </Notice>
  );
}
