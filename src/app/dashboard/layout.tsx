import type { ReactNode } from "react";
import { getVendorSession } from "@/lib/vendor-session";
import { getOrCreateVendorProfile } from "@/lib/merqo-vendor-profile";
import { signOutAction } from "@/app/actions/auth";
import { SiteFooter } from "@/components/site-footer";
import { accountLabel } from "@merqo/ui";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { supabase, user } = await getVendorSession();
  const profile = await getOrCreateVendorProfile(supabase, user.id, null);

  const rawAvatar = user.user_metadata?.avatar_url;
  const avatarUrl = typeof rawAvatar === "string" ? rawAvatar : null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="contents print:hidden">
        <DashboardNav
          signOut={signOutAction}
          accountName={accountLabel(user, profile.stall_name)}
          avatarUrl={avatarUrl}
        />
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-7">
        {children}
      </main>
      <div className="contents print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
