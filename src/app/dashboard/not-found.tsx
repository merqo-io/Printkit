import Link from "next/link";
import { NotFound } from "@merqo/ui";

/** Keeps a bad /dashboard/... URL inside the dashboard shell and nav. */
export default function DashboardNotFound() {
  return (
    <NotFound
      title="Page not found"
      description="This link may be out of date, or the booth or printer it pointed at no longer exists."
      homeHref="/dashboard"
      homeLabel="Back to overview"
      LinkComponent={Link}
    />
  );
}
