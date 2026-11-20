# about

## Purpose

The public `/about` page the shared footer's "About" link points at. It
renders `@merqo/ui`'s `AboutMerqo` (the family's shared Merqo story) for
printkit, the same way qkit and loopkit do, so that link never lands on the
404 page.

## Contents

- `page.tsx` — `AboutPage`: `SiteNav` (shared `LandingNav`, with Dashboard and the account menu when signed in, resolved by `getNavUser()`), `AboutMerqo kitName="printkit"`
  with a "Read the Bluetooth printer guide" text link to the public
  `/guides/bluetooth-printers` (a signed-out visitor is not sent into the
  dashboard), and `SiteFooter`
  with the sign-in link shown. Its tab title is "About".
- `page.dom.test.tsx` — renders the real `AboutMerqo` copy: it names printkit, the call to action links to the public printer guide, and it has no `$`, em dash or banned words.

## Parent

[app](../README.md)
