import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { readBoundedJson, RequestBodyError } from "@/lib/bounded-json";
import { rateLimit, RATE_WINDOW_SECONDS } from "@/lib/rate-limit";
import { renderStickerTemplate } from "@/lib/render-sticker-template";
import { loadStickerLogos, parseStickerTemplate } from "@/lib/sticker-logos";

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to preview a sticker." },
      { status: 401 },
    );
  const allowed = await rateLimit(
    await createServiceClient(),
    `sticker-preview:${user.id}`,
    30,
    RATE_WINDOW_SECONDS,
  );
  if (!allowed)
    return NextResponse.json(
      { error: "Too many previews. Wait a moment and try again." },
      { status: 429 },
    );
  let body: unknown;
  try {
    body = await readBoundedJson(request, MAX_BODY_BYTES);
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 400;
    return NextResponse.json({ error: "Invalid design." }, { status });
  }
  // The service role reads the logo bucket, so only the caller's own folder is ever fetched.
  const template = parseStickerTemplate(body);
  const ownTemplate = template && {
    ...template,
    elements: template.elements.filter(
      (element) =>
        element.kind !== "logo" || element.path.startsWith(`${user.id}/`),
    ),
  };
  const logos = ownTemplate
    ? await loadStickerLogos(ownTemplate, undefined, "preview")
    : undefined;
  const result = renderStickerTemplate(
    body,
    {
      order_number: `#${"001"}`,
      customer_name: "Alex",
      item_name: "Kopi",
      item_options: "O (black)\nHot\nNormal sugar",
      unit_position: "1 / 3",
      booth_name: "Kopitiam Cart",
    },
    203,
    { logos },
  );
  if (!result.ok)
    return NextResponse.json(
      { error: result.error, elementId: result.elementId },
      { status: 422 },
    );
  return new Response(new Uint8Array(result.png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
