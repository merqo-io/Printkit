import Link from "next/link";
import { LandingAccountNav, LandingNav, type NavUser } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { signOutAction } from "@/app/actions/auth";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { submitLandingSupportAction } from "@/app/actions/landing-account";
import { Wordmark } from "@/components/wordmark";
import { SUPPORT_CATEGORY_LABELS } from "@/lib/schemas";

/**
 * The top bar of printkit's public pages (`/about` and the Bluetooth guide):
 * `@merqo/ui`'s shared `LandingNav` with the printkit wordmark. printkit has
 * no landing page or sign-up of its own (vendors arrive from qkit), so the
 * one primary action is signing in. With a `user` (a signed-in visitor)
 * the Sign in button is replaced by a Dashboard link and the shared account
 * menu, which carries Sign out; the wordmark leads to the dashboard too.
 */
export function SiteNav({ user }: { user?: NavUser | null }) {
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
          {user ? (
            <LandingAccountNav
              kit="printkit"
              dashboardHref="/dashboard"
              user={user}
              signOutAction={signOutAction}
              LinkComponent={Link}
              actions={{
                submitSupport: submitLandingSupportAction,
                submitFeedback: submitFeedbackAction,
              }}
              supportCategories={SUPPORT_CATEGORY_LABELS}
            />
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
