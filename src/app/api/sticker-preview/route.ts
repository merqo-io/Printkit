import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { renderStickerTemplate } from "@/lib/render-sticker-template";

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
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES)
    return NextResponse.json(
      { error: "The design is too large." },
      { status: 413 },
    );
  const reader = request.body?.getReader();
  if (!reader)
    return NextResponse.json({ error: "Invalid design." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return NextResponse.json(
        { error: "The design is too large." },
        { status: 413 },
      );
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Invalid design." }, { status: 400 });
  }
  const result = renderStickerTemplate(body, {
    order_number: `#${"001"}`,
    customer_name: "Alex",
    item_name: "Kopi",
    item_options: "O (black)\nHot\nNormal sugar",
    unit_position: "1 / 3",
    booth_name: "Kopitiam Cart",
  });
  if (!result.ok)
    return NextResponse.json(
      { error: result.error, elementId: result.elementId },
      { status: 422 },
    );
  return new Response(new Uint8Array(result.png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
