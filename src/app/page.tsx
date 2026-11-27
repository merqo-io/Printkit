import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hero } from "@/components/landing/hero";
import { PrintJourney } from "@/components/landing/print-journey";
import { LandingClosing, LandingFaq } from "@/components/landing/sections";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { createServerClient } from "@/lib/supabase/server";

// The one indexable page: the root layout's noindex stays for every other route.
export const metadata: Metadata = {
  title: { absolute: "printkit | Print qkit orders on a Bluetooth printer" },
  description:
    "printkit turns each order from a qkit booth into a label for your printer. In build, not yet tried with vendors.",
  robots: { index: true, follow: true },
};

/** The public landing for signed-out visitors; a signed-in vendor goes straight to the dashboard. */
export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav user={null} />
      <main className="flex-1">
        <Hero />
        <PrintJourney />
        <LandingFaq />
        <LandingClosing />
      </main>
      <SiteFooter showSignIn />
    </div>
  );
}
