import Link from "next/link";
import { AboutMerqo } from "@merqo/ui";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/wordmark";

/** The footer's About link: the family's shared Merqo story, for printkit. */
export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-2xl px-5 pt-10">
        <Link
          href="/dashboard"
          aria-label="printkit home"
          className="text-2xl transition-opacity hover:opacity-80"
        >
          <Wordmark />
        </Link>
      </header>
      <main className="flex-1">
        <AboutMerqo kitName="printkit">
          <Button asChild size="lg">
            <Link href="/dashboard/printers">Set up a printer</Link>
          </Button>
        </AboutMerqo>
      </main>
      <SiteFooter showSignIn />
    </div>
  );
}
