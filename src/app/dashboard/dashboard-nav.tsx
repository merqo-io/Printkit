"use client";

import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { usePathname } from "next/navigation";
import { DashboardNav as SharedDashboardNav, getSwitchKits } from "@merqo/ui";
import { GET_HELP, submitAccountFeedback } from "@/lib/account-menu-wiring";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/printers", label: "Printers" },
  { href: "/dashboard/history", label: "History" },
];

function isActive(path: string, href: string): boolean {
  return href === "/dashboard" ? path === "/dashboard" : path.startsWith(href);
}

/**
 * Composes @merqo/ui's DashboardNav/AccountMenu — same shared-component
 * contract every sibling kit uses. No plan/tier/tour concept here, so
 * those optional props are simply omitted (see Plan 3 Global Constraints).
 */
export function DashboardNav({
  signOut,
  vendorName,
  avatarUrl = null,
}: {
  signOut: () => Promise<void>;
  vendorName: string;
  avatarUrl?: string | null;
}) {
  const path = usePathname();

  return (
    <SharedDashboardNav
      wordmark={
        <Link
          href="/dashboard"
          aria-label="printkit dashboard home"
          className="font-display shrink-0 text-3xl font-semibold tracking-tight outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Wordmark className="text-3xl" />
        </Link>
      }
      navLinks={LINKS}
      isActiveHref={(href) => isActive(path, href)}
      vendor={{
        name: vendorName || "Account",
        avatarUrl: avatarUrl ?? undefined,
        // `subtitle` is the only line @merqo/ui's AccountMenu renders next
        // to the trigger and in the dropdown header, so the vendor name
        // needs to go there, not just into the initials-only `name` field.
        subtitle: vendorName || "Account",
      }}
      signOutAction={signOut}
      switchKits={getSwitchKits("printkit")}
      extraLink={{
        href: "/guides/bluetooth-printers",
        label: "Bluetooth guide",
      }}
      getHelp={GET_HELP}
      onFeedbackSubmit={submitAccountFeedback}
      feedbackSource="vendor"
      feedbackMetric="nps"
      showNps
    />
  );
}
