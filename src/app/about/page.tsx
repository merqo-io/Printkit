import type { Metadata } from "next";
import Link from "next/link";
import { AboutMerqo } from "@merqo/ui";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "About",
};

/** The footer's About link: the family's shared Merqo story, for printkit. */
export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
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
