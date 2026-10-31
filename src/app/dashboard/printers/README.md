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
  address, Edit SN and KEY, or Open bridge mode) and a "More" group with View
  setup steps, Design label, Use a different printer and Remove printer
  (`printer-actions.tsx`, confirm panel first). An offline printer also shows
  a one-line check for its type. With no booths the page lists three numbered
  steps, linking to qkit when `NEXT_PUBLIC_QKIT_URL` is set.
- `actions.ts` — `removePrinter`: vendor session, Zod-checked booth id, delete
  scoped to the vendor, `admin_audit` entry `printer_removed`. Device
  credentials cascade; queued jobs stay on the booth for the next printer.
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
  - Brand-cloud printer: insert a SIM or join WiFi, then type the SN and KEY
    off the device. The KEY is used once to claim the printer and never
    stored.
  - Bluetooth printer: choose Android (continue in Bridge mode) or Raspberry
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
