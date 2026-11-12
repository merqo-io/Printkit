import Link from "next/link";
import { NotFound } from "@merqo/ui";
import { Wordmark } from "@/components/wordmark";

/** Branded fallback for a missing page or an out-of-date setup link. */
export default function NotFoundPage() {
  return (
    <NotFound
      wordmark={<Wordmark className="text-3xl" />}
      title="Page not found"
      description="This link may be out of date, or the booth or printer it pointed at no longer exists."
      homeHref="/dashboard"
      homeLabel="Back to overview"
      LinkComponent={Link}
    />
  );
}
