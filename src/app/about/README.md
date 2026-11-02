# about

## Purpose

The public `/about` page the shared footer's "About" link points at. It
renders `@merqo/ui`'s `AboutMerqo` (the family's shared Merqo story) for
printkit, the same way qkit and loopkit do, so that link never lands on the
404 page.

## Contents

- `page.tsx` — `AboutPage`: `SiteNav` (shared `LandingNav`), `AboutMerqo kitName="printkit"`
  with a "Set up a printer" button to `/dashboard/printers` (signed-out
  visitors are sent to sign in first by `src/proxy.ts`), and `SiteFooter`
  with the sign-in link shown. Its tab title is "About".
- `page.dom.test.tsx` — renders the real `AboutMerqo` copy: it names printkit, the button links to printer setup, and it has no `$`, em dash or banned words.

## Parent

[app](../README.md)
