import type { Metadata } from "next";
import { getVendorSession } from "@/lib/vendor-session";
import { listActiveLocations } from "@/lib/print-locations";
import { PageHeader } from "@/components/page-header";
import { TextLink } from "@/components/text-link";
import { PrinterPicker } from "./printer-picker";

export const metadata: Metadata = {
  title: "Choose a printer",
};

export default async function NewPrinterPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { user } = await getVendorSession();
  const [locations, { location }] = await Promise.all([
    listActiveLocations(user.id),
    searchParams,
  ]);

  // A link that names a booth opens that booth or nothing: falling back to
  // another booth would set a printer up on the wrong one.
  const booth = location
    ? locations.find((item) => item.id === location)
    : locations[0];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Choose a printer"
        back={{ href: "/dashboard/printers", label: "Printers" }}
        description={
          booth
            ? `Which printer will print labels at ${booth.label}?`
            : "Turn printing on for a booth in qkit first."
        }
      />

      {booth ? (
        <PrinterPicker
          locationId={booth.id}
          includeDev={process.env.VERCEL_ENV !== "production"}
        />
      ) : (
        <p className="text-sm">
          <TextLink href="/dashboard/printers">Back to printers</TextLink>
        </p>
      )}
    </div>
  );
}
