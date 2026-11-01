"use client";

import { useEffect, useRef, useState } from "react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CatalogEntry } from "@/lib/printer-catalog";
import { createPrinterUrl } from "./actions";
import { Step, Steps, WaitingForPrinter } from "./setup-step";

export function CloudPollSetup({
  entry,
  locationId,
}: {
  entry: CatalogEntry;
  locationId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { pending: busy, run } = useAsyncAction();
  const titleRef = useRef<HTMLParagraphElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  // The trigger is unmounted while the panel is open, so focus can only go
  // back to it after the re-render that brings it back.
  useEffect(() => {
    if (confirming) {
      titleRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  const cancelConfirm = () => {
    restoreFocus.current = true;
    setConfirming(false);
  };

  const onCreate = async () => {
    return run(async () => {
      try {
        const result = await createPrinterUrl(locationId, entry.id);

        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setUrl(result.url);
        restoreFocus.current = true;
        setConfirming(false);
      } catch {
        toast.error("Could not complete setup. Please try again.");
      }
    });
  };

  return (
    <Steps>
      <Step number={1} title="Get this booth's printer address">
        {url ? (
          <div className="space-y-2">
            <code className="bg-muted block rounded-md px-3 py-2 font-mono text-xs break-all">
              {url}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard
                  .writeText(url)
                  .then(() => toast.success("Address copied"))
                  .catch(() => toast.error("Could not copy the address"));
              }}
            >
              Copy address
            </Button>
            <p className="text-muted-foreground text-xs">
              Keep this private. Anyone with it can print to this booth. Make a
              new one if it leaks. The old one stops working.
            </p>
            {confirming ? (
              <div
                role="alertdialog"
                aria-labelledby="new-address-title"
                aria-describedby="new-address-details"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !busy) cancelConfirm();
                }}
                className="bg-muted/50 space-y-3 rounded-md border p-4"
              >
                <p
                  id="new-address-title"
                  ref={titleRef}
                  tabIndex={-1}
                  className="font-medium outline-none"
                >
                  Make a new address?
                </p>
                <p
                  id="new-address-details"
                  className="text-muted-foreground text-sm"
                >
                  The old address stops working at once. The printer will not
                  print again until you paste the new address into its settings.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onCreate}
                    disabled={busy}
                  >
                    {busy ? "Working…" : "Make a new address"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelConfirm}
                    disabled={busy}
                  >
                    Keep the old one
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                ref={triggerRef}
                variant="outline"
                size="sm"
                onClick={() => setConfirming(true)}
              >
                Make a new address
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={onCreate} disabled={busy}>
            {busy ? "Working…" : "Create the address"}
          </Button>
        )}
      </Step>

      <Step
        number={2}
        title={`Open the ${entry.brand} printer's own settings page`}
      >
        <p className="text-muted-foreground text-sm">
          Put the printer on the same WiFi as your iPad, then open its settings
          page in a browser. The printer&apos;s manual shows how to find its
          address.
        </p>
      </Step>

      <Step number={3} title="Paste the address into CloudPRNT settings">
        <p className="text-muted-foreground text-sm">
          Turn CloudPRNT on, paste the address into the server URL box, and set
          the poll interval to 5 seconds. Save and restart the printer.
        </p>
      </Step>

      <Step number={4} title="Wait for it to connect">
        <WaitingForPrinter locationId={locationId} />
      </Step>
    </Steps>
  );
}
