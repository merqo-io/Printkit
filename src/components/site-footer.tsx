import Link from "next/link";
import { Footer } from "@merqo/ui";
import { Wordmark } from "@/components/wordmark";

/**
 * printkit's copy of the family footer: `@merqo/ui`'s shared `Footer` with
 * the printkit wordmark and tagline. The dashboard leaves the sign-in link
 * off, since everyone there is already signed in.
 */
export function SiteFooter({ showSignIn = false }: { showSignIn?: boolean }) {
  return (
    <Footer
      kitName="printkit"
      tagline="Order labels for Merqo vendors."
      showSignIn={showSignIn}
      wordmark={
        <Link
          href="/dashboard"
          aria-label="printkit home"
          className="text-lg transition-opacity hover:opacity-80"
        >
          <Wordmark />
        </Link>
      }
    />
  );
}
