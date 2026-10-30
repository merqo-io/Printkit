import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getVendorSession } from "@/lib/vendor-session";
import { listActiveLocations } from "@/lib/print-locations";
import { stickerTemplateSchema } from "@/lib/sticker-template";
import { StickerDesigner } from "./sticker-designer";

export default async function DesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { user, supabase } = await getVendorSession();
  const [locations, params] = await Promise.all([
    listActiveLocations(user.id),
    searchParams,
  ]);
  let location = locations.length === 1 ? locations[0] : undefined;
  if (params.location)
    location = locations.find((item) => item.id === params.location);
  if (!location) notFound();
  const { data, error } = await supabase
    .from("sticker_templates")
    .select("design")
    .eq("location_id", location.id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error("Could not load sticker design");
  const initial = data ? stickerTemplateSchema.safeParse(data.design) : null;
  if (initial && !initial.success)
    throw new Error("Stored sticker design is invalid");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Sticker designer"
        back={{ href: "/dashboard/printers", label: "Printers" }}
        description={`Design a label for ${location.label}.`}
      />
      <StickerDesigner
        locationId={location.id}
        initialTemplate={initial?.data}
      />
    </div>
  );
}
