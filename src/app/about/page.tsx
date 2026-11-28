import type { Metadata } from "next";
import { AboutMerqo } from "@merqo/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { TextLink } from "@/components/text-link";
import { getNavUser } from "@/lib/nav-user";

export const metadata: Metadata = {
  title: "About",
};

/** The footer's About link: the family's shared Merqo story, for printkit. */
export default async function AboutPage() {
  const user = await getNavUser();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={user} />
      <main className="flex-1">
        <AboutMerqo kitName="printkit">
          <TextLink
            href="/guides/bluetooth-printers"
            className="inline-flex min-h-11 items-center"
          >
            Read the Bluetooth printer guide
          </TextLink>
        </AboutMerqo>
      </main>
      <SiteFooter showSignIn />
    </div>
  );
}
