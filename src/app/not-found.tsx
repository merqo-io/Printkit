import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ElevatedCard } from "@/components/elevated-card";
import { Wordmark } from "@/components/wordmark";

/** Branded fallback for a missing page or an out-of-date setup link. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
        </div>
        <ElevatedCard className="px-7 py-10 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This link may be out of date, or the booth or printer it pointed at
            no longer exists.
          </p>
          <Button asChild className="mt-7 h-11 w-full rounded-xl">
            <Link href="/dashboard/printers">Go to printers</Link>
          </Button>
        </ElevatedCard>
      </div>
    </main>
  );
}
