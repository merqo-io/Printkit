import type { Metadata } from "next";
import { UnroutedJobsNotice } from "@/app/dashboard/unrouted-jobs-notice";

export const metadata: Metadata = {
  title: "Unrouted jobs preview",
};

export default function UnroutedPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div data-testid="unrouted-one">
        <UnroutedJobsNotice count={1} />
      </div>
      <div data-testid="unrouted-many">
        <UnroutedJobsNotice count={3} />
      </div>
    </div>
  );
}
