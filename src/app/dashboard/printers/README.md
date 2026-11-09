# printers

## Purpose

Where a vendor chooses a printer for a booth and gets it printing. It is
the main entry point of the dashboard, in place of the old bridge-only
screen, because most vendors now use a printer that needs no bridge at all.

Everything a vendor reads here avoids printkit's own vocabulary: no
connector, driver, endpoint or poll. A booth has a printer, and the printer
is online or it is not.

## Contents

- `page.tsx` — one row per booth: the printer, whether it is online (from
  the shared `last_seen_at` signal), loaded through one vendor-scoped printer summary query, what kind it is in plain words, and the
  one action that makes sense next. A booth with no printer offers only
  "Choose a printer". A booth with a printer shows its main action (Printer
  address, Edit serial and key, or Connect a Bluetooth printer) and a "More" group with View
  setup steps, Design label, Use a different printer and Remove printer
  (`printer-actions.tsx`; the confirm is the shared `ConfirmDialog`, Escape or Cancel closes it and focus returns to More, and a failed removal shows its message in the dialog, and "Make a new address" in cloud setup asks the same way). An offline printer also shows
  a one-line check for its type (the virtual printer is told to press Start on its page instead of checking WiFi). With no booths the page lists three numbered
  steps, linking to qkit when `NEXT_PUBLIC_QKIT_URL` is set.
- `test-print-button.tsx` - the "Print test label" button on each printer row and the setup wizard's connected state; takes an `offline` prop (from `last_seen_at` health) that disables it with a plain note; shows sent, queued and error messages inline and disables itself while sending.
- `actions.ts` — `removePrinter`: vendor session, Zod-checked booth id, delete
  scoped to the vendor, `admin_audit` entry `printer_removed` (detail: booth,
  type, model). A 4G printer is first unregistered from the maker's account,
  best effort: a failure is logged and the removal still goes ahead. Device
  credentials cascade; queued jobs stay on the booth for the next printer.
  `sendTestPrint`: vendor session, Zod-checked booth id, printer looked up by vendor and booth, label access required (a friendly upgrade message otherwise, failing closed if the lookup errors), one test per booth per minute, a `print_jobs` row with `source_kit` `printkit-test` (so no kit callback), dispatched at once for 4G printers, audited as `test_print_sent`.
  Each row carries the id `booth-<location id>` (`locationRowId`), which the
  status API's `manage_url` names so a calling kit's "manage this booth's
  printer" link lands on the right row, which is outlined while it is the
  link's target.
  The tab title is "Printers"; the picker's is "Choose a printer" and setup's is "Set up a printer".
  Each booth is a `Panel` list item; "Untested with real hardware" is an outline `Badge`.
- `new/page.tsx` and `new/printer-picker.tsx` — the picker. Cards come from
  the static catalog, filtered by "works with iPad alone" (on by default,
  because that is the recommendation), connection, and the label width a
  stall actually buys; sorted by recommendation (iPad alone with no
  monthly cost first and cheapest first, then 4G printers with a data plan,
  then Bluetooth, from `compareRecommended`), setup effort or price. Each
  card states its monthly cost.
  Every badge carries an `InfoButton`, so a vendor can find out what "4G" or
  "untested" means without leaving the page. A Bluetooth card says it is the
  most setup and links to the guide before the vendor can continue.
  The picker opens with a short note saying which printers work with an
  iPad alone and what a Bluetooth-only printer needs, with a link to the
  guide. A link that names a booth the vendor has no active location for
  shows no picker, never another booth's.
  Calling kits link here instead of repeating that advice.
- `setup/page.tsx`, the connector setup files exported by `setup/setup-wizard.tsx`, and `setup/actions.ts` — one
  wizard per kind of printer, each a short numbered list ending in a live
  wait that turns into "Connected" when the printer first reports in:
  - Cloud printer: mint this booth's private printer address once, copy it,
    paste it into the printer's own settings page.
  - 4G printer: insert a SIM or join WiFi, then type the serial number and key
    off the device. The key is used once to claim the printer and never
    stored.
  - Bluetooth printer: choose Android (continue on the Connect a Bluetooth printer page) or Raspberry
    Pi (show a single-use pairing code), after a banner that says this is
    not recommended.

  Every action re-derives that the booth belongs to the caller, and refuses
  a booth that already has a different printer rather than silently
  re-pointing it.

## Connectivity

Reads `@/lib/printer-catalog`, `@/lib/printers` and `@/lib/printer-info-copy`;
writes through `@/lib/device-credentials`, `@/lib/bridge-pairing` and the
vendor-cloud driver. Links out to `/guides/bluetooth-printers` and
`/dashboard/bridge`.

## Parent

[dashboard](../README.md)

`designer/` is an unfinished booth-scoped sticker editor candidate; saved templates are not yet used by order printing.

The Printers header carries a "Printers" eyebrow, as do its child pages (designer, new, setup, and bridge).

When label access is denied, `sendTestPrint` also returns `upgradeUrl` (the Merqo dashboard) and `TestPrintButton` renders the message with a real upgrade link. The `error` text is unchanged.

Printer pages and actions take `Button`, `Badge` and `cn` from `@merqo/ui/primitives`.

The Upgrade link uses `merqoUpgradeUrl` from `@/lib/upgrade-url`.
