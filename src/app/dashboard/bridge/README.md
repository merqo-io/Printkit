# Bridge Device Integration

Hooks and components for the bridge device's dashboard, managing real-time job delivery and status synchronization.

The Bridge-mode runtime: Web Bluetooth pairing to a NIIMBOT B1, automatic
printing of any job the Realtime feed delivers, test print, print-failure
UX. This is the only part of printkit that ever touches
`navigator.bluetooth`/`navigator.wakeLock`.

## Contents

- **`page.tsx`** — Server component: calls `getVendorSession`, server-fetches the vendor's `listActiveLocations`, and resolves which `BridgePanel` to render — a `?booth=<id>` search param (matched against a location's `source_ref`, e.g. qkit's own booth id — deep-linked from qkit's booth settings "Choose the printer for this booth" link) skips straight to that location's panel; otherwise auto-selects when there's exactly one location, shows a message pointing to qkit's booth settings when there are none, and renders `BridgeLocationGate` to let the vendor pick when there are 2+.
- **`bridge-location-gate.tsx`** — Client component holding the picked-location state between `page.tsx`'s server-fetched location list and `BridgePanel`: renders `LocationPicker` until a booth is chosen, then renders `BridgePanel` with the resolved `locationId`.
- **`location-picker.tsx`** — Presentational `LocationPicker({locations, onSelect})`: one button per active location, calling `onSelect(id)` on click.
- **`page.tsx` layout** — `PageHeader` ("Bridge mode", back to Printers) over a `Panel` holding the body.
- **`bridge-panel.tsx`** — The Bridge-mode state machine, scoped to a single `locationId` prop: local toggle (persisted via `isBridgeModeEnabled`/`setBridgeModeEnabled`, logs `admin_audit` `bridge_disconnected` on toggle-off), Web Bluetooth pairing (`connectPrinter`/`disconnectPrinter`, logs `admin_audit` `printer_paired` on success, and registers the booth's `niimbot-b1` printer row via `ensureBridgePrinter`), and auto-print on job delivery. The bridge draws nothing itself: a realtime event is only a hint, so each job is first claimed through `claimBridgeJob` (which is what stops two bridges printing the same label), then its PNG is downloaded from `/api/bridge/jobs/[id]/label` and printed, then the outcome is reported. Prints are chained through a ref-held promise queue so two jobs queued close together can't run overlapping Bluetooth sequences. Pairing also claims any job that arrived while the bridge was off and has not expired. A heartbeat every 20 seconds (`bridgeHeartbeat`) is the health signal, replacing the old presence channel; it says whether a printer is paired, and one is sent straight after pairing. If the printer drops by itself (`onPrinterDisconnect`), the panel forgets the client, shows "Printer disconnected" with a Reconnect button, and later heartbeats stop marking the printer seen, so the booth goes offline on the dashboard instead of claiming a printer that is not there. Test print asks the server for a sample label at this booth's own size, verifying the paired printer rather than any real job. Only one test print runs at a time: the button reads "Printing test…" and is disabled until it finishes, so repeated taps never print extra labels. A dropped printer clears that state.
  On a device that cannot run Web Bluetooth, the panel shows only a shadcn `Alert` and no toggle or pair button: iPhone and iPad (every iOS browser, Chrome for iOS included) get "Bluetooth printing does not work on iPhone or iPad" with the Android, computer or cloud-printer alternatives; other browsers without `navigator.bluetooth` are told to use Chrome or Edge; a non-https page is told to switch to https. Detection is `getBluetoothSupport` in `src/lib/bluetooth-support.ts`, run after hydration.
  A failed pairing shows the error with a "Try again" button that reruns the same Web Bluetooth pairing, so a vendor never has to toggle Bridge mode to retry.
- **`use-job-delivery.ts`** — Subscribes to Supabase Realtime `postgres_changes` on the `print_jobs` table, filtered to a single location. Fires a callback with the job's `id`, `payload`, and `job_type` (defaults to `'label'` if a row somehow lacks one) when a new row arrives with status `queued`, enabling the bridge device to receive print jobs (and their customer/order data) from the calling kit's order system. Re-subscribes on `visibilitychange` since Realtime silently drops a backgrounded tab's connection.
- **`use-wake-lock.ts`** — Owns the Screen Wake Lock: acquired when Bridge mode turns on, re-acquired on `visibilitychange` since a wake lock auto-releases on tab-hide. A sleeping screen takes Bluetooth and the realtime connection with it, which is this transport's documented failure mode. It does not override Battery Saver, so the setup guide tells vendors to turn that off.
- **`use-leave-guard.ts`** — `useLeaveGuard(active)`: while a printer is paired, asks before the vendor leaves the page, because leaving drops the Bluetooth connection and orders stop printing. A reload or closed tab gets the browser's own `beforeunload` prompt; an in-app link (dashboard nav, Back to Printers) gets a `window.confirm`, caught in the capture phase so a cancel stops Next's `Link` before it navigates. New-tab, download, modified and same-page clicks pass through. The browser back button is not covered: the App Router cannot cancel it.
- **`actions.ts`** — `reportPrintResult`: confirms the job belongs to the calling vendor (same ownership check as `history/actions.ts`'s `reprintJob`) before delegating to `updatePrintJobStatus`, letting the client-side `BridgePanel` report a print attempt's outcome without importing service-role code directly or being able to flip another vendor's job. `logBridgeEvent(action, detail?)`: writes an `admin_audit` row for bridge-side events (printer paired, bridge disconnected) that aren't a `print_jobs` write. `claimBridgeJob(locationId, jobId?)`: re-derives that the booth belongs to the caller, then claims through `claim_job` — with no `jobId` it claims whatever is waiting, which is how pairing picks up a job queued while the bridge was off. `bridgeHeartbeat(locationId, printerPaired)`: sweeps the booth, and stamps the printer's `last_seen_at` only when a printer is paired. `ensureBridgePrinter(locationId)`: creates the booth's Bluetooth printer row once, so it carries the same connector, driver and health signal as every other printer.

## Which devices can run this

Any browser with Web Bluetooth, which in practice means Chrome on Android,
Windows or macOS. Verified 2026-09-22 on a NIIMBOT B1 from Chrome on
Windows. An iPad or iPhone cannot run Bridge mode at all: Apple allows no
Web Bluetooth, WebUSB or Web Serial in any iOS browser, and a cable does
not change that. That limit is the reason the other two connectors exist.

## Known printer quirk

A real NIIMBOT B1 prints the label and then stays silent instead of
acknowledging it, so `printLabel` (`@/lib/niimbot-print`) accepts an
acknowledgement timeout that arrives after the page was sent. Anything
else still fails the job, and the vendor can reprint from History.

## Parent

See [../README.md](../README.md).

Claiming returns the job ID and its `sentAt` timestamp. The browser carries
that timestamp through printing and echoes it when reporting the result.
Ownership and the incoming attempt are checked before settlement and again
in the conditional UPDATE, so a delayed report cannot settle a later reclaim
of the same job. Same-attempt identical retries succeed without another
callback. Refresh already-open bridges after this protocol deployment.

The page's tab title is "Bridge mode", matching its heading.
