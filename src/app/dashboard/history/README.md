# history

## Purpose

Vendor-facing print job history — full list, newest first.

## Contents

- `page.tsx` loads 50 jobs and an older-page cursor using `listPrintHistoryPage`. The validated created_at/id cursor preserves stable ordering; unrouted filtering happens in the database before the limit. Queries continue across lower server caps and errors propagate to the dashboard error boundary. A malformed, stale or edited `?cursor=` fails `isHistoryCursor` and shows the newest page, keeping `?unrouted=1`.
- `page.tsx` also renders a `SegmentedControl` ("All labels" / "Needs a booth"; the latter is the `?unrouted=1` deep link) and passes an empty message that fits the view (no unrouted jobs, no older jobs). Paging links are outline buttons.
- `job-history-table.tsx` — domain column adapter over shared `DataTable` for jobs (customer name, order #, booth, status badge, created time, action). The booth column shows the embedded `print_locations.label` for a routed job, or "Needs a booth" plus an `AssignLocationControl` when `location_id` is null. A failed row shows a plain-language line under its badge from `failure-reason-copy.ts` (maps `failure_reason` codes, with a fallback for null or unknown codes; the raw code is never shown). The action column renders `ReprintButton` (a "Print this label again?" confirm step, disabled while pending, success toast names the booth) for `failed` or already-`printed` rows (a vendor who lost/peeled a good label can reprint it too, not just a genuine failure) — `queued`/`sent` stay excluded, since reprinting either would race an in-flight print. A dashboard test label (`source_kit` `printkit-test`) reads "Test print" with no order number. Empty state when there are no jobs yet.
  Takes an optional `emptyMessage` (the muted sentence under the "No labels yet." headline of the shared `EmptyState`). Below `sm` it renders `JobHistoryCards` instead of the table (both are in the DOM, CSS shows one), so Overview gets the phone layout too. Reprint is hidden for test prints.
- `job-history-cards.tsx` — phone card list for the same rows: flat 12px-radius cards, status word + colour, mono order number and time.
- `assign-location-control.tsx` — client component for manually routing an unrouted job: a one-click "Assign to {label}" button when the vendor has exactly one active location, a shadcn `Select` (with an sr-only "Booth for this label" label) + confirm button when there are 2+, and nothing when there are none. Calls `assignPrintLocation`.
- `actions.ts` - `reprintJob(jobId)` server action: confirms the job belongs to the calling vendor and is `failed` or already `printed`, resets it to `queued` via `updatePrintJobStatus` (which stamps `requeued_at`, restarting the 30-minute expiry), requires label access first (upgrade message when denied, generic error when the lookup fails, so a lapsed vendor cannot reprint old jobs), hands it to `dispatchJob` so a 4G printer gets it straight away (polling printers and bridges pick it up on their next poll), logs an `admin_audit` entry, and calls `revalidatePath("/dashboard/history")` so the table reflects the new status without a manual reload. `assignPrintLocation(jobId, locationId)` is a separate sibling action that atomically requires a queued job without a booth, touches only `location_id` and `requeued_at` (so a job that waited a long time without a booth does not expire the moment it is routed), then dispatches it the same way, for assigning a booth to a job without one. It writes through the service-role client (print_jobs has no UPDATE grant for `authenticated`), first verifying `locationId` belongs to the calling vendor via a `print_locations` lookup scoped by `vendor_id`; also revalidates `/dashboard/history`.
- `reprint-button.tsx` — client component wrapping `reprintJob` with a pending state and a success/error toast.

`failure-reason-copy.ts` keeps its fallback sentence module-private; callers go through the reason lookup.

## Parent

See [../README.md](../README.md).

Reprint compares the observed terminal status and both sent/requeue timestamps
in its conditional write. A delayed request from an earlier printed attempt
cannot enqueue another print after a newer attempt reaches the same status.

The page's tab title is "History", matching its heading.

`reprintJob` and `assignPrintLocation` parse their job and booth ids as UUIDs before any session or database call.

`reprintJob` refuses a job whose payload is `{}` (cleared by the 90-day retention purge) with a "no longer be reprinted" error rather than printing a blank label.

Batch labels appear as individual jobs, so a missing or failed label can be inspected and reprinted separately.

The History header (the shared `@merqo/ui` `PageHeader`) carries a "Label history" eyebrow.

When label access is denied, `reprintJob` also returns `upgradeUrl` (the Merqo dashboard) and `ReprintButton` shows the message in the toast with a real upgrade link. The `error` text is unchanged.

History controls take `Button`, `Select`, `Badge` and `cn` from `@merqo/ui/primitives`; the assign-location `Select` trigger is 44px on touch screens.

`ActionResult` and `useAsyncAction` come from `@merqo/ui` (`@merqo/ui/kit-api` for the type); the Upgrade link uses `merqoUpgradeUrl` from `@/lib/upgrade-url`.
