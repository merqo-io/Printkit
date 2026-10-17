"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bluetooth, ChevronDown, Signal, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoButton } from "@/components/info-button";
import { Panel } from "@/components/panel";
import { TextLink } from "@/components/text-link";
import {
  compareRecommended,
  isRecommended,
  listCatalog,
  worksWithIpadAlone,
  type CatalogEntry,
} from "@/lib/printer-catalog";
import { PRINTER_CHOICE_ADVICE } from "@/lib/printer-info-copy";
import { cn } from "@/lib/utils";

type Connection = "4g" | "wifi" | "bluetooth";
type Sort = "recommended" | "setup" | "price";

const CONNECTION_LABEL: Record<Connection, string> = {
  "4g": "4G",
  wifi: "WiFi",
  bluetooth: "Bluetooth",
};

const CONNECTION_ICON = {
  "4g": Signal,
  wifi: Wifi,
  bluetooth: Bluetooth,
};

const PRICE_LABEL = { low: "$", mid: "$$", high: "$$$" } as const;

const WIDTHS = [40, 50, 60] as const;

function setupWords(effort: CatalogEntry["setupEffort"]): string {
  if (effort === 1) return "Plug in and go";
  if (effort === 2) return "A few setup steps";
  return "Needs a helper device";
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors pointer-coarse:h-10 pointer-coarse:px-4",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function PrinterPicker({
  locationId,
  includeDev,
}: {
  locationId: string;
  includeDev: boolean;
}) {
  const [ipadOnly, setIpadOnly] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [width, setWidth] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>("recommended");

  const entries = useMemo(() => listCatalog({ includeDev }), [includeDev]);

  const shown = useMemo(() => {
    const priceOrder = { low: 0, mid: 1, high: 2 };

    return entries
      .filter((entry) => !ipadOnly || worksWithIpadAlone(entry))
      .filter(
        (entry) =>
          connections.length === 0 ||
          connections.some((connection) =>
            entry.connectivity.includes(connection),
          ),
      )
      .filter((entry) => width === null || entry.labelWidthMm.max >= width)
      .sort((a, b) => {
        if (sort === "price") {
          return priceOrder[a.priceBand] - priceOrder[b.priceBand];
        }
        if (sort === "setup") return a.setupEffort - b.setupEffort;
        return compareRecommended(a, b);
      });
  }, [entries, ipadOnly, connections, width, sort]);

  const toggleConnection = (connection: Connection) => {
    setConnections((current) =>
      current.includes(connection)
        ? current.filter((value) => value !== connection)
        : [...current, connection],
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {PRINTER_CHOICE_ADVICE}{" "}
        <TextLink href="/guides/bluetooth-printers">Read why</TextLink>
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={ipadOnly} onClick={() => setIpadOnly(!ipadOnly)}>
            Works with iPad alone
          </Chip>
          <InfoButton topic="ipad_alone" />

          <span className="bg-border mx-1 hidden h-6 w-px sm:block" />

          {(Object.keys(CONNECTION_LABEL) as Connection[]).map((connection) => (
            <Chip
              key={connection}
              active={connections.includes(connection)}
              onClick={() => toggleConnection(connection)}
            >
              {CONNECTION_LABEL[connection]}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Fits labels</span>
          <InfoButton topic="label_width" />
          {WIDTHS.map((value) => (
            <Chip
              key={value}
              active={width === value}
              onClick={() => setWidth(width === value ? null : value)}
            >
              {value} mm
            </Chip>
          ))}

          <span className="bg-border mx-1 hidden h-6 w-px sm:block" />

          <label className="text-muted-foreground text-sm" htmlFor="sort">
            Sort
          </label>
          {/* Native on purpose: iPadOS opens its own touch picker for it. */}
          <span className="relative inline-flex">
            <select
              id="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 appearance-none rounded-md border bg-transparent pr-8 pl-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] pointer-coarse:h-10 dark:bg-input/30"
            >
              <option value="recommended">Recommended</option>
              <option value="setup">Easiest setup</option>
              <option value="price">Lowest price</option>
            </select>
            <ChevronDown
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
            />
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No printer matches those filters. Turn one off to see more.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {shown.map((entry) => (
            <PrinterCard key={entry.id} entry={entry} locationId={locationId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PrinterCard({
  entry,
  locationId,
}: {
  entry: CatalogEntry;
  locationId: string;
}) {
  const needsHelper = !worksWithIpadAlone(entry);

  return (
    <Panel as="li" data-printer={entry.id} className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {entry.brand}
          </p>
          <h2 className="text-base font-semibold">{entry.model}</h2>
        </div>
        <span className="text-muted-foreground text-sm">
          {PRICE_LABEL[entry.priceBand]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {entry.connectivity
          .filter(
            (value): value is Connection =>
              value === "4g" || value === "wifi" || value === "bluetooth",
          )
          .map((connection) => {
            const Icon = CONNECTION_ICON[connection];
            return (
              <span
                key={connection}
                className="text-muted-foreground inline-flex items-center gap-1 text-xs"
              >
                <Icon aria-hidden className="size-3.5" />
                {CONNECTION_LABEL[connection]}
                <InfoButton topic={connection} />
              </span>
            );
          })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isRecommended(entry) && (
          <>
            <Badge>Recommended</Badge>
            <InfoButton topic="recommended" />
          </>
        )}
        {needsHelper ? (
          <>
            <Badge variant="outline">Needs a helper device</Badge>
            <InfoButton topic="helper_device" />
          </>
        ) : (
          <>
            <Badge variant="secondary">Works with iPad alone</Badge>
            <InfoButton topic="ipad_alone" />
          </>
        )}
        {!entry.hardwareVerified && (
          <>
            <Badge variant="outline">Untested with real hardware</Badge>
            <InfoButton topic="untested" />
          </>
        )}
      </div>

      <dl className="text-muted-foreground mt-4 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="inline-flex items-center gap-1">
            Setup
            <InfoButton topic="setup_effort" />
          </dt>
          <dd className="text-foreground">{setupWords(entry.setupEffort)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="inline-flex items-center gap-1">
            Monthly cost
            <InfoButton topic="monthly_cost" />
          </dt>
          <dd className="text-foreground">
            {entry.monthlyCost === "none" ? "None" : "4G data plan"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Labels up to</dt>
          <dd className="text-foreground">{entry.labelWidthMm.max} mm</dd>
        </div>
      </dl>

      {entry.notes.length > 0 && (
        <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
          {entry.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {needsHelper && (
        <p className="border-border text-muted-foreground mt-4 border-t pt-3 text-sm">
          Not recommended: most setup.{" "}
          <TextLink href="/guides/bluetooth-printers">
            Read what this needs first
          </TextLink>
        </p>
      )}

      <div className="mt-auto pt-5">
        <Button asChild className="w-full">
          <Link
            href={`/dashboard/printers/setup?location=${encodeURIComponent(
              locationId,
            )}&model=${encodeURIComponent(entry.id)}`}
          >
            Set up this printer
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
