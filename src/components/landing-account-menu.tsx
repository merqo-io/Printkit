"use client";

import Link from "next/link";
import { AccountMenu, getSwitchKits } from "@merqo/ui";
import { signOutAction } from "@/app/actions/auth";
import { GET_HELP, submitAccountFeedback } from "@/lib/account-menu-wiring";

/**
 * Account dropdown for the public nav. The handlers are closures, which can't
 * cross the server/client boundary, so this client wrapper owns them while
 * `SiteNav` stays a Server Component.
 */
export function LandingAccountMenu({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  return (
    <AccountMenu
      vendor={{ name, avatarUrl, subtitle: name }}
      signOutAction={signOutAction}
      LinkComponent={Link}
      switchKits={getSwitchKits("printkit")}
      getHelp={GET_HELP}
      onFeedbackSubmit={submitAccountFeedback}
      feedbackSource="vendor"
      feedbackMetric="nps"
      showNps
    />
  );
}
