import Link from "next/link";
import { BackButton } from "@merqo/ui";

/**
 * The way back to the printers list, for the `back` slot of the shared
 * PageHeader. The negative margin lines the button's text up with the title
 * below, since the shared header leaves the slot flush with the content box.
 */
export function PrintersBackLink() {
  return (
    <div className="-ml-3">
      <BackButton
        href="/dashboard/printers"
        label="Printers"
        LinkComponent={Link}
      />
    </div>
  );
}
