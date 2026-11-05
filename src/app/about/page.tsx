import type { Metadata } from "next";
import { AboutMerqo } from "@merqo/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { TextLink } from "@/components/text-link";

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
          <TextLink href="/dashboard/printers">Set up a printer</TextLink>
        </AboutMerqo>
      </main>
      <SiteFooter showSignIn />
    </div>
  );
}
