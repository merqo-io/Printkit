import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalPageMetadata } from "@merqo/ui";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = legalPageMetadata("terms");

export default function TermsPage() {
  return (
    <LegalPage
      doc="terms"
      kit="printkit"
      wordmark={<Wordmark className="text-2xl" />}
      homeHref="/"
      LinkComponent={Link}
    />
  );
}
