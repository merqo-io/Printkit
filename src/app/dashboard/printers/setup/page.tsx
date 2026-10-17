import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorSession } from "@/lib/vendor-session";
import { listActiveLocations } from "@/lib/print-locations";
import { getCatalogEntry } from "@/lib/printer-catalog";
import { PageHeader } from "@/components/page-header";
import { CloudPollSetup, VendorCloudSetup, BridgeSetup } from "./setup-wizard";

export const metadata: Metadata = {
  title: "Set up a printer",
};

export default async function PrinterSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; model?: string }>;
}) {
  const { user } = await getVendorSession();
  const [locations, { location, model }] = await Promise.all([
    listActiveLocations(user.id),
    searchParams,
  ]);

  const booth = locations.find((item) => item.id === location);
  const entry = model ? getCatalogEntry(model) : null;
  if (!booth || !entry) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/dashboard/printers", label: "Printers" }}
        title={`Set up the ${entry.brand} ${entry.model}`}
        description={`Labels for ${booth.label}, ${entry.defaultLabelMm.width} mm by ${entry.defaultLabelMm.height} mm.`}
      />

      <div>
        {entry.connector === "cloud_poll" && (
          <CloudPollSetup entry={entry} locationId={booth.id} />
        )}
        {entry.connector === "vendor_cloud" && (
          <VendorCloudSetup entry={entry} locationId={booth.id} />
        )}
        {entry.connector === "bridge" && (
          <BridgeSetup locationId={booth.id} boothRef={booth.source_ref} />
        )}
      </div>
    </div>
  );
}
