import Link from "next/link";
import { LandingNav } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { LandingAccountMenu } from "@/components/landing-account-menu";
import { Wordmark } from "@/components/wordmark";
import type { NavAccount } from "@/lib/nav-account";

/**
 * The top bar of printkit's public pages (`/about` and the Bluetooth guide):
 * `@merqo/ui`'s shared `LandingNav` with the printkit wordmark. printkit has
 * no landing page or sign-up of its own (vendors arrive from qkit), so the
 * one primary action is signing in. With an `account` (a signed-in visitor)
 * the Sign in button is replaced by a Dashboard link and the shared account
 * menu, which carries Sign out; the wordmark leads to the dashboard too.
 */
export function SiteNav({ account }: { account?: NavAccount }) {
  return (
    <LandingNav
      wordmark={
        <Link
          href="/dashboard"
          aria-label="printkit home"
          className="font-display text-3xl font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <Wordmark className="text-3xl" />
        </Link>
      }
      end={
        <>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden rounded-lg sm:inline-flex"
          >
            <Link href="/about">About</Link>
          </Button>
          {account ? (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-lg">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <LandingAccountMenu
                name={account.name}
                avatarUrl={account.avatarUrl}
              />
            </>
          ) : (
            <Button asChild className="h-10 rounded-lg px-5 font-semibold">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </>
      }
    />
  );
}
