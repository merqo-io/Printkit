"use client";

import Link from "next/link";
import { Button } from "@merqo/ui/primitives";
import { ErrorPage } from "@merqo/ui";
import { Wordmark } from "@/components/wordmark";

function report(error: Error) {
  console.error("Root error boundary caught", error);
}

/** Branded fallback for route errors, with retry and home navigation. */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Next's `retry` re-fetches the segment; `reset` only clears the error
  // state, so the shared page's reset slot gets `retry`.
  return (
    <ErrorPage
      error={error}
      reset={retry}
      onError={report}
      wordmark={<Wordmark className="text-3xl" />}
      title="Something went wrong"
      description="We hit a snag loading this page. Try again, or go back to the overview if it keeps happening."
      actions={
        <Button asChild variant="outline" className="h-11 w-full rounded-xl">
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      }
    />
  );
}
