import type { Metadata } from "next";
import { getVendorSession } from "@/lib/vendor-session";
import { listActiveLocations } from "@/lib/print-locations";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import {
  SetupStepsEmpty,
  boothPrintingSteps,
} from "@/components/setup-steps-empty";
import { BridgePanel } from "./bridge-panel";
import { BridgeLocationGate } from "./bridge-location-gate";

export const metadata: Metadata = {
  title: "Connect a Bluetooth printer",
};

function BridgeBody({
  vendorId,
  locations,
  preselectedLocationId,
}: {
  vendorId: string;
  locations: { id: string; label: string }[];
  preselectedLocationId: string | null;
}) {
  if (locations.length === 0) {
    return (
      <SetupStepsEmpty
        heading="No booths have printing turned on yet."
        steps={boothPrintingSteps(process.env.NEXT_PUBLIC_QKIT_URL)}
      />
    );
  }
  const resolvedId =
    preselectedLocationId ?? (locations.length === 1 ? locations[0].id : null);
  if (resolvedId) {
    return <BridgePanel vendorId={vendorId} locationId={resolvedId} />;
  }
  return <BridgeLocationGate vendorId={vendorId} locations={locations} />;
}

export default async function BridgePage({
  searchParams,
}: {
  // booth = a location's source_ref; skips the picker when it matches.
  searchParams: Promise<{ booth?: string }>;
}) {
  const { user } = await getVendorSession();
  const [locations, { booth }] = await Promise.all([
    listActiveLocations(user.id),
    searchParams,
  ]);
  const preselectedLocationId = booth
    ? (locations.find((loc) => loc.source_ref === booth)?.id ?? null)
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Printers"
        title="Connect a Bluetooth printer"
        back={{ href: "/dashboard/printers", label: "Printers" }}
        description="On the phone or tablet next to your printer, turn on printing below, then pair the printer. Keep this page open while you sell."
      />
      <Panel>
        <BridgeBody
          vendorId={user.id}
          locations={locations}
          preselectedLocationId={preselectedLocationId}
        />
      </Panel>
    </div>
  );
}
