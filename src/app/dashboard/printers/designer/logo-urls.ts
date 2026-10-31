import type { StickerTemplate } from "@/lib/sticker-template";
import { LOGO_BUCKET, LOGO_URL_SECONDS } from "./logo-image";

type Storage = {
  from: (bucket: string) => {
    createSignedUrls: (
      paths: string[],
      seconds: number,
    ) => PromiseLike<{
      data: { path: string | null; signedUrl: string | null }[] | null;
    }>;
  };
};

// Signed with the vendor's own session so bucket RLS decides what they may see.
export async function signLogoUrls(
  storage: Storage,
  template?: StickerTemplate,
): Promise<Record<string, string>> {
  const paths = (template?.elements ?? []).flatMap((element) =>
    element.kind === "logo" ? [element.path] : [],
  );
  const urls: Record<string, string> = {};
  if (!paths.length) return urls;
  const { data } = await storage
    .from(LOGO_BUCKET)
    .createSignedUrls(paths, LOGO_URL_SECONDS);
  for (const item of data ?? [])
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  return urls;
}
