# setup

## Purpose

The setup wizard for the chosen printer, one flow per kind of printer.

## Contents

- `page.tsx` — resolves the booth and catalog entry, and renders a `PageHeader` with a way back to Printers. The tab title is a static "Set up a printer"; the heading names the model. An unknown booth or model goes to the root `not-found.tsx`.
- `setup-wizard.tsx` — compatibility exports for the connector components.
- `setup-step.tsx` — re-exports `Step`/`Steps` from `@/components/steps` and owns `WaitingForPrinter`, the printer-state poll with teardown (announced as `role="status"`, success in `success-text`).
- In `bridge-setup.tsx` the help icon after the helper-device buttons sits 4px
  further right (`ml-1`): its 44px touch area reaches 10px past the 24px icon,
  and the row's 8px gap alone let it cover the last button's edge.
- `cloud-poll-setup.tsx`, `vendor-cloud-setup.tsx`, `bridge-setup.tsx` — cloud printer (copy its private address), brand-cloud
  printer (SN and KEY), Bluetooth (a Chrome helper device: an Android
  phone, a Windows laptop or a Mac, never an iPad, or a Raspberry Pi
  pairing code), each ending in a live wait for the printer's first check-in.
  The Bluetooth flow opens with a warning `Notice`. Until a helper device is chosen, its step 2 says to choose one, so the steps read 1, 2, 3 rather than skipping to 3.
- `actions.ts` — the server actions behind each step. Each re-checks the
  booth belongs to the caller. The printer address needs an absolute
  origin (`@/lib/site-url`), and setup refuses rather than hand out a
  relative one.

## Parent

[printers](../README.md)

Wizard regressions cover pending actions, pairing failure and safe retry behavior. Pairing uses an expiring opaque code and does not expose a standing device credential.
