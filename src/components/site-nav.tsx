import Link from "next/link";
import { LandingNav } from "@merqo/ui";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

/**
 * The top bar of printkit's public pages (`/about` and the Bluetooth guide):
 * `@merqo/ui`'s shared `LandingNav` with the printkit wordmark. printkit has
 * no landing page or sign-up of its own (vendors arrive from qkit), so the
 * one primary action is the dashboard, which sends a signed-out visitor to
 * sign in.
 */
export function SiteNav() {
  return (
    <LandingNav
      wordmark={
        <Link
          href="/dashboard"
          aria-label="printkit home"
          className="font-display text-3xl font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <Wordmark />
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
          <Button asChild className="h-10 rounded-lg px-5 font-semibold">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </>
      }
    />
  );
}
