"use client";

import Link from "next/link";
import { LegalPage } from "@merqo/ui";
import { Wordmark } from "@/components/wordmark";

// A client boundary is needed because the @merqo/ui bundle inlines the
// client-only LegalDocument into LegalPage without its "use client"
// directive, so a Server Component render 500s in production. Drop this
// wrapper once the package keeps the boundary.
export function LegalPageClient({
  doc,
  kit,
}: {
  doc: "terms" | "privacy";
  kit?: string;
}) {
  return (
    <LegalPage
      doc={doc}
      kit={kit}
      wordmark={
        <span>
          <Wordmark className="text-2xl" />
          <span className="sr-only">printkit home</span>
        </span>
      }
      LinkComponent={Link}
    />
  );
}
