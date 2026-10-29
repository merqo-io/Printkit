import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyKitAuth } from "@/lib/kit-auth";
import { createPrintJob } from "@/lib/print-jobs";
import { labelBatchSchema } from "@/lib/label-batch";
import { readBoundedJson, RequestBodyError } from "@/lib/bounded-json";

const bodySchema = z
  .object({
    vendor_id: z.uuid(),
    payload: z.record(z.string(), z.unknown()),
    source_ref: z.string().min(1),
    location_ref: z.string().optional(),
    // DB still only accepts 'label' today — accepted here so the API shape
    // isn't hardcoded to one job type ahead of the DB constraint widening.
    job_type: z.string().optional(),
    labels: labelBatchSchema.optional(),
  })
  .refine(
    (body) => (body.job_type === "label_batch") === (body.labels !== undefined),
    {
      message: "label_batch requires labels and labels require label_batch",
    },
  );

export async function POST(request: Request) {
  const auth = await verifyKitAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await readBoundedJson(request, 64 * 1024);
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

  const result = await createPrintJob({
    vendorId: parsed.data.vendor_id,
    payload: parsed.data.payload,
    sourceKit: auth.kitSlug,
    sourceRef: parsed.data.source_ref,
    locationRef: parsed.data.location_ref,
    jobType: parsed.data.job_type,
    ...(parsed.data.labels ? { labels: parsed.data.labels } : {}),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
