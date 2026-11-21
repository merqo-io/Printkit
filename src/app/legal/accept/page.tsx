import type { Metadata } from "next";
import { AcceptTermsForm, AuthShell, safeRedirectPath } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { signOutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/wordmark";
import { acceptLegalTerms } from "./actions";

export const metadata: Metadata = {
  title: "Accept the updated terms",
};

export const revalidate = 0;

// Deliberately does NOT call any legal-gate check (getVendorSession) — this
// page is what that gate redirects TO, so gating it the same way is an
// infinite redirect loop. acceptLegalTerms (actions.ts) re-checks for a
// signed-in user on submit and sends a signed-out visitor to /login.
//
// AuthShell + AcceptTermsForm are used instead of AcceptTermsPage because the
// latter has no slot for the "Sign out instead" exit a visitor who declines
// the terms needs. The sign-out form sits in the footer, a sibling of the
// accept form, since forms cannot nest.
export default async function LegalAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      wordmark={<Wordmark className="text-3xl" />}
      title="Our terms have been updated"
      subtitle="Please review and accept before continuing."
      footer={
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full text-sm"
          >
            Sign out instead
          </Button>
        </form>
      }
    >
      <AcceptTermsForm
        action={acceptLegalTerms}
        next={safeRedirectPath(next, "/dashboard")}
        submitLabel="Accept and continue"
      />
    </AuthShell>
  );
}
