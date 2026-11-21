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

// Deliberately runs no legal-gate check: this is where the gate redirects, so
// gating it would loop. acceptLegalTerms re-checks the user on submit.
// AcceptTermsPage has no slot for the "Sign out instead" exit, so the
// shell and form are composed here, with sign-out as a sibling form.
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
