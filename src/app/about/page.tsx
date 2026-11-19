import type { Metadata } from "next";
import { AboutMerqo } from "@merqo/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { TextLink } from "@/components/text-link";
import { getNavAccount } from "@/lib/nav-account";

export const metadata: Metadata = {
  title: "About",
};

/** The footer's About link: the family's shared Merqo story, for printkit. */
export default async function AboutPage() {
  const account = await getNavAccount();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav account={account} />
      <main className="flex-1">
        <AboutMerqo kitName="printkit">
          <TextLink href="/guides/bluetooth-printers">
            Read the Bluetooth printer guide
          </TextLink>
        </AboutMerqo>
      </main>
      <SiteFooter showSignIn />
    </div>
  );
}
