import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalPageMetadata } from "@merqo/ui";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = legalPageMetadata("privacy");

export default function PrivacyPage() {
  return (
    <LegalPage
      doc="privacy"
      wordmark={<Wordmark className="text-2xl" />}
      homeHref="/"
      LinkComponent={Link}
    />
  );
}
