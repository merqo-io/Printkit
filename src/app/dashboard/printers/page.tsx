import type { Metadata } from "next";
import Link from "next/link";
import { getVendorSession } from "@/lib/vendor-session";
import { listLocationPrinterSummaries } from "@/lib/location-printer-summaries";
import { getCatalogEntry } from "@/lib/printer-catalog";
import { locationRowId } from "@/lib/manage-url";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { PrinterStatusRow } from "@/components/printer-status-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutoRefresh } from "../auto-refresh";
import { PrinterActions } from "./printer-actions";

export const metadata: Metadata = {
  title: "Printers",
};

const CONNECTOR_LABEL: Record<string, string> = {
  cloud_poll: "Cloud printer",
  vendor_cloud: "4G printer",
  bridge: "Bluetooth printer with a helper device",
};

const OFFLINE_HINT: Record<string, string> = {
  cloud_poll: "Check it is on and connected to WiFi.",
  vendor_cloud: "Check it is on and has signal.",
  bridge: "Open bridge mode on the helper device.",
};

function setupStepsHref(locationId: string, catalogId: string): string {
  return `/dashboard/printers/setup?location=${encodeURIComponent(
    locationId,
  )}&model=${encodeURIComponent(catalogId)}`;
}

export default async function PrintersPage() {
  const { user } = await getVendorSession();
  const qkitUrl = process.env.NEXT_PUBLIC_QKIT_URL || null;
  const rows = await listLocationPrinterSummaries(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <AutoRefresh />
      <PageHeader
        title="Printers"
        description="One printer per booth. New orders print by themselves once a booth has a printer that is online."
      />

      {rows.length === 0 ? (
        <Panel>
          <p className="font-medium">No booths have printing turned on yet.</p>
          <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>
              In{" "}
              {qkitUrl ? (
                <a href={qkitUrl} className="text-foreground underline">
                  qkit
                </a>
              ) : (
                "qkit"
              )}
              , turn on printing for your booth.
            </li>
            <li>Pick your printer here.</li>
            <li>Print a test label.</li>
          </ol>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ location, printer, state }) => (
            <Panel
              as="li"
              key={location.id}
              id={locationRowId(location.id)}
              className="target:ring-ring scroll-mt-4 target:ring-2"
            >
              <PrinterStatusRow
                label={location.label}
                printerName={printer?.display_name ?? null}
                state={state}
                lastSeenAt={printer?.last_seen_at ?? null}
              />

              {state === "offline" && printer && (
                <p className="text-muted-foreground mt-3 text-sm">
                  {OFFLINE_HINT[printer.connector] ??
                    "Check the printer is on."}{" "}
                  <Link
                    href={setupStepsHref(location.id, printer.catalog_id)}
                    className="text-foreground underline"
                  >
                    View setup steps
                  </Link>
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-4">
                {printer ? (
                  <>
                    <span className="text-muted-foreground text-sm">
                      {CONNECTOR_LABEL[printer.connector] ?? printer.connector}
                    </span>
                    {!getCatalogEntry(printer.catalog_id)?.hardwareVerified && (
                      <Badge variant="outline">
                        Untested with real hardware
                      </Badge>
                    )}
                    <span className="grow" />
                    <PrinterActions
                      locationId={location.id}
                      boothRef={location.source_ref}
                      boothLabel={location.label}
                      catalogId={printer.catalog_id}
                      connector={printer.connector}
                    />
                  </>
                ) : (
                  <Button asChild size="sm">
                    <Link
                      href={`/dashboard/printers/new?location=${encodeURIComponent(
                        location.id,
                      )}`}
                    >
                      Choose a printer
                    </Link>
                  </Button>
                )}
              </div>
            </Panel>
          ))}
        </ul>
      )}
    </div>
  );
}
