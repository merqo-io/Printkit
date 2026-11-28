# landing

## Purpose

The public landing at `/` for signed-out visitors, shown in `src/app/page.tsx`
between the shared `SiteNav` and `SiteFooter`. printkit is "In build", so the
page never reads as live and carries no price.

## Contents

- `hero.tsx` - `Hero`: the In build badge and explainer, H1, lede, Sign in CTA, and a demo of a label printing as a qkit order lands. Server render, no JavaScript and reduced motion show the finished frame; otherwise it plays once after mount, with Replay.
- `print-journey.tsx` - `PrintJourney`: the three steps (pair printer, order in, label prints) on `@merqo/ui`'s `Journey`; scroll plays and rewinds each stage through `useScrollPlay`.
- `sections.tsx` - `LandingFaq` (exactly three rows plus a link to `/guides/bluetooth-printers`) and `LandingClosing` (`ClosingCall`).
- `screens.tsx` - the mock phone screens, printer slot and label. Every string is a real one: the Bridge panel's button and status text, `JobStatusBadge`, and the label designer's sample fields.
- `rhythm.ts` - shared container and section padding classes.
- `guardrails.dom.test.tsx` - no em dash, price or live claim; In build badge; three journey steps and three FAQ rows; guide link; reduced-motion final state.

The hero buttons, the guide link and the demo's "Pair printer" and "Print test" buttons have a minimum height of 44px (`min-h-11`) for touch.

## Parent

[components](../README.md)
