"use client";

import Image from "next/image";
import type { StickerTemplate } from "@/lib/sticker-template";
import { uploadStickerLogo } from "./actions";
import { examples } from "./sticker-content";

type Element = StickerTemplate["elements"][number];
type LogoElement = Extract<Element, { kind: "logo" }>;

export async function uploadLogo(
  locationId: string,
  file: File,
): Promise<
  { ok: true; path: string; url: string } | { ok: false; error: string }
> {
  const body = new FormData();
  body.set("locationId", locationId);
  body.set("file", file);
  return uploadStickerLogo(body).catch(() => ({
    ok: false as const,
    error: "Could not upload the logo. Please try again.",
  }));
}

export function newLogoElement(
  template: StickerTemplate,
  path: string,
): LogoElement {
  const size = Math.min(
    12,
    template.widthMm - 2 * template.marginMm,
    template.heightMm - 2 * template.marginMm,
  );
  return {
    id: crypto.randomUUID(),
    kind: "logo",
    path,
    xMm: template.marginMm,
    yMm: template.marginMm,
    widthMm: size,
    heightMm: size,
  };
}

export function ElementFace({
  element,
  logoUrls,
}: {
  element: Element;
  logoUrls: Record<string, string>;
}) {
  if (element.kind === "field") return <>{examples[element.field]}</>;
  const url = logoUrls[element.path];
  if (!url) return <>Logo</>;
  return (
    <Image
      unoptimized
      fill
      src={url}
      alt="Logo"
      className="pointer-events-none object-contain"
    />
  );
}

export function LogoPanel({
  hasLogo,
  uploading,
  onFile,
}: {
  hasLogo: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const label = hasLogo ? "Replace logo" : "Upload logo";
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Logo</h2>
      <label className="block text-sm font-medium">
        {label}
        <input
          aria-label={label}
          type="file"
          accept="image/png,image/jpeg"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFile(file);
          }}
          className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
        />
      </label>
      <p className="text-muted-foreground text-sm">
        PNG or JPEG, up to 512 KB and 1024 by 1024 pixels. Logos show in this
        editor but are not printed yet.
      </p>
    </div>
  );
}
