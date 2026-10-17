import type { Metadata } from "next";
import { ElevatedCard } from "@/components/elevated-card";
import { Wordmark } from "@/components/wordmark";
import { AcceptForm } from "./accept-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Accept the updated terms",
};

export const revalidate = 0;

// Deliberately does NOT call any legal-gate check (getVendorSession) — this
// page is what that gate redirects TO, so gating it the same way is an
// infinite redirect loop. acceptLegalTerms (actions.ts) re-checks for a
// signed-in user on submit and sends a signed-out visitor to /login.
export default async function LegalAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
        </div>
        <ElevatedCard className="px-7 py-8">
          <h1 className="font-display text-2xl leading-tight font-semibold">
            Our terms have been updated
          </h1>
          <p className="mt-1.5 mb-6 text-sm text-muted-foreground">
            Please review and accept before continuing.
          </p>
          <AcceptForm next={safeRedirectPath(next, "/dashboard")} />
        </ElevatedCard>
      </div>
    </main>
  );
}
