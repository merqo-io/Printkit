import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getVendorSession } from "@/lib/vendor-session";
import { listActiveLocations } from "@/lib/print-locations";
import { VirtualPrinterPanel } from "./virtual-printer-panel";

export const metadata: Metadata = {
  title: "Virtual printer",
};

export default async function VirtualPrinterPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const { user } = await getVendorSession();
  const locations = await listActiveLocations(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Printers"
        title="Virtual printer"
        description="A test printer that prints to this page. It uses the same connection a real cloud printer uses, so you can check the whole path without hardware."
        back={{ href: "/dashboard/printers", label: "Printers" }}
      />

      <div>
        {locations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No booths have printing enabled yet. Turn it on in qkit&apos;s booth
            settings first.
          </p>
        ) : (
          <VirtualPrinterPanel locations={locations} />
        )}
      </div>
    </div>
  );
}
