import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyKitAuth } from "@/lib/kit-auth";
import { createOrUpdatePrintLocation } from "@/lib/print-locations";
import { readBoundedJson, RequestBodyError } from "@/lib/bounded-json";
import {
  enforceIpLimit,
  enforceKitLimit,
  KIT_IP_LIMIT,
} from "@/lib/rate-limit";

const bodySchema = z.object({
  vendor_id: z.uuid(),
  source_ref: z.string().trim().min(1).max(128),
  label: z.string().trim().min(1).max(128),
  active: z.boolean(),
});

export async function POST(request: Request) {
  const ipLimited = await enforceIpLimit(request, "kit-ip", KIT_IP_LIMIT);
  if (ipLimited) return ipLimited;
  const auth = await verifyKitAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const kitLimited = await enforceKitLimit(auth.kitSlug);
  if (kitLimited) return kitLimited;

  let json: unknown;
  try {
    json = await readBoundedJson(request, 16 * 1024);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const result = await createOrUpdatePrintLocation({
    vendorId: parsed.data.vendor_id,
    sourceKit: auth.kitSlug,
    sourceRef: parsed.data.source_ref,
    label: parsed.data.label,
    active: parsed.data.active,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
