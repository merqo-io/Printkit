import { PageHeader } from "@/components/page-header";
import { getVendorSession } from "@/lib/vendor-session";
import { StickerDesigner } from "./sticker-designer";

export default async function DesignerPage() {
  await getVendorSession();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Sticker designer"
        back={{ href: "/dashboard/printers", label: "Printers" }}
        description="Arrange the information on your label and preview it before printing."
      />
      <StickerDesigner />
    </div>
  );
}
