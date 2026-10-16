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

const CONNECTOR_LABEL: Record<string, string> = {
  cloud_poll: "Cloud printer",
  vendor_cloud: "Brand-cloud printer",
  bridge: "Bluetooth printer with a helper device",
};

export default async function PrintersPage() {
  const { user } = await getVendorSession();
  const rows = await listLocationPrinterSummaries(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Printers"
        description="One printer per booth. New orders print by themselves once a booth has a printer that is online."
      />

      {rows.length === 0 ? (
        <Panel>
          <p className="text-muted-foreground text-sm">
            No booths have printing enabled yet. Turn it on in qkit&apos;s booth
            settings, then come back here.
          </p>
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
                    {printer.connector === "bridge" && (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/dashboard/bridge?booth=${encodeURIComponent(
                            location.source_ref,
                          )}`}
                        >
                          Open bridge mode
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/dashboard/printers/setup?location=${encodeURIComponent(
                          location.id,
                        )}&model=${encodeURIComponent(printer.catalog_id)}`}
                      >
                        Setup steps
                      </Link>
                    </Button>
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
