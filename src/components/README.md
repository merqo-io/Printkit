# components

## Purpose

Shared React components — not scoped to one dashboard sub-route. One
subfolder groups a larger cluster (`ui/` shadcn primitives); everything
else sits flat here.

## Contents

- `setup-steps-empty.tsx` — `SetupStepsEmpty({ heading, steps })`: the dashed-border numbered-steps empty state used by the Printers page, bridge page and first-run panel, plus `boothPrintingSteps` (shared copy) and `safeQkitUrl`. Local so it can be swapped for merqo-ui later.
- `printer-status-row.tsx` — `PrinterStatusRow({ label, printerName, state,
lastSeenAt })`: one booth's printer and whether it is reachable. On a phone the status sits under the booth name instead of beside it, so a long "Offline since" time wraps inside the card. A booth with no printer shows no name line, only the "No printer yet" status. It renders
  what the server already read from `printers.last_seen_at`, the health
  signal every connector shares, so no page needs a live subscription and a
  cloud printer, a 4G printer and a Bluetooth bridge all report the same
  way. It replaced a presence-channel component that only a Bluetooth
  bridge could ever feed.
- `info-button.tsx` — `InfoButton({ topic })`: the small "i" next to a badge
  or filter, opening that topic's plain-language explanation from
  `@/lib/printer-info-copy`. It composes shared InfoTooltip with a 24px trigger and opens on tap rather than hover, because
  vendors read these on an iPad where a hover tooltip never appears, and the
  trigger is a real button so it is reachable by keyboard.
- `elevated-card.tsx` — `ElevatedCard({ as, className, children })`: the
  shared raised-card container (rounded, bordered, soft shadow) used by the
  login page and the root error boundary, matching every other kit's
  login page.
- `site-nav.tsx` — `SiteNav()`: `@merqo/ui`'s `LandingNav` with the printkit wordmark (to `/dashboard`), About and a "Sign in" button (to `/login`), the top bar of the public pages (`/about`, the Bluetooth guide).
- `page-header.tsx` — `PageHeader({ eyebrow, title, description, action, back })`:
  the top of every dashboard page, with an optional uppercase eyebrow, the
  title in the display face, a muted description, an optional action slot
  (stacks under the title on phones, sits right on `sm`+) and an optional way
  back, drawn as the shared `BackButton`. One `h1` only.
- `panel.tsx` — `Panel({ as, className, children })`: the bordered container
  dashboard content sits in. Panels are never nested.
- `segmented-control.tsx` — `SegmentedControl({ label, options })`: an
  either/or switch of links (`aria-current` on the active one), 44px tall on
  coarse pointers.
- `notice.tsx` — `Notice({ tone, title, children })`: a neutral, info or
  warning callout, coloured from the status tokens.
- `steps.tsx` — `Steps` and `Step({ number, title })`: the numbered sequence
  used by every printer setup flow.
- `text-link.tsx` — `TextLink`: the one inline link style (accent colour, offset
  underline, visible focus ring).
- `site-footer.tsx` — `SiteFooter({ showSignIn })`: `@merqo/ui`'s shared
  family `Footer` with the printkit wordmark, tagline and copyright. The
  dashboard hides the sign-in link (everyone there is signed in); the public
  `/about` page and Bluetooth guide show it. Same adapter shape as
  stockkit's `SiteFooter`.
- `wordmark.tsx` — `Wordmark({ className })`: the "PrintKit" brand mark
  (magenta "Print" + plain "Kit"). Used by the dashboard navigation, reset-password page, Bluetooth guide, `src/app/error.tsx` and
  `src/app/login/page.tsx`.

## Connectivity

`elevated-card.tsx` is used by `login/page.tsx` and
`src/app/error.tsx`. `wordmark.tsx` is used by `src/app/error.tsx` and
`src/app/login/page.tsx` (not by `src/app/page.tsx`, which redirects to `/dashboard`). `printer-status-row.tsx` is used by overview and printers pages; offline timestamps are displayed in the Singapore timezone.
`ui/` is used throughout `src/app/` and `src/components/`.

## Parent

[printkit](../../README.md)
