import { z } from "zod";

const fieldSchema = z.enum([
  "order_number",
  "customer_name",
  "item_name",
  "item_options",
  "unit_position",
  "booth_name",
]);

const boxSchema = z.object({
  id: z.uuid(),
  xMm: z.number().finite().min(0).max(200),
  yMm: z.number().finite().min(0).max(500),
  widthMm: z.number().finite().min(2).max(200),
  heightMm: z.number().finite().min(2).max(500),
});

const textElementSchema = boxSchema.extend({
  kind: z.literal("field"),
  field: fieldSchema,
  fontSizeMm: z.number().finite().min(1.5).max(30),
  bold: z.boolean(),
  align: z.enum(["left", "center", "right"]),
});

const uuidPart = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// A storage key inside the private logo bucket, never a URL, so a design cannot point at external content.
export const logoPathSchema = z
  .string()
  .regex(new RegExp(`^${uuidPart}/${uuidPart}/${uuidPart}\\.(png|jpg)$`));

const logoElementSchema = boxSchema.extend({
  kind: z.literal("logo"),
  path: logoPathSchema,
});

export const MAX_LOGOS = 4;

export const stickerTemplateSchema = z
  .object({
    version: z.literal(1),
    widthMm: z.number().finite().min(20).max(200),
    heightMm: z.number().finite().min(20).max(500),
    marginMm: z.number().finite().min(0).max(20),
    elements: z
      .array(
        z.discriminatedUnion("kind", [textElementSchema, logoElementSchema]),
      )
      .min(1)
      .max(30),
  })
  .superRefine((template, ctx) => {
    // Each logo is decoded into memory at render time, so the count is bounded.
    if (template.elements.filter((e) => e.kind === "logo").length > MAX_LOGOS) {
      ctx.addIssue({
        code: "custom",
        message: `At most ${MAX_LOGOS} logos per sticker`,
        path: ["elements"],
      });
    }
    if (
      template.marginMm * 2 >=
      Math.min(template.widthMm, template.heightMm)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Margins leave no printable area",
        path: ["marginMm"],
      });
    }
    const ids = new Set<string>();
    template.elements.forEach((element, index) => {
      if (ids.has(element.id))
        ctx.addIssue({
          code: "custom",
          message: "Element IDs must be unique",
          path: ["elements", index, "id"],
        });
      ids.add(element.id);
      if (
        element.xMm < template.marginMm ||
        element.yMm < template.marginMm ||
        element.xMm + element.widthMm > template.widthMm - template.marginMm ||
        element.yMm + element.heightMm > template.heightMm - template.marginMm
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Element extends outside printable margins",
          path: ["elements", index],
        });
      }
    });
  });

export type StickerTemplate = z.infer<typeof stickerTemplateSchema>;

export const defaultStickerTemplate: StickerTemplate = {
  version: 1,
  widthMm: 40,
  heightMm: 60,
  marginMm: 2,
  elements: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      kind: "field",
      field: "order_number",
      xMm: 3,
      yMm: 3,
      widthMm: 24,
      heightMm: 8,
      fontSizeMm: 6,
      bold: true,
      align: "left",
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      kind: "field",
      field: "unit_position",
      xMm: 28,
      yMm: 3,
      widthMm: 9,
      heightMm: 8,
      fontSizeMm: 3,
      bold: false,
      align: "right",
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      kind: "field",
      field: "item_name",
      xMm: 3,
      yMm: 15,
      widthMm: 34,
      heightMm: 9,
      fontSizeMm: 5,
      bold: true,
      align: "left",
    },
    {
      id: "10000000-0000-4000-8000-000000000004",
      kind: "field",
      field: "item_options",
      xMm: 3,
      yMm: 26,
      widthMm: 34,
      heightMm: 23,
      fontSizeMm: 3,
      bold: false,
      align: "left",
    },
    {
      id: "10000000-0000-4000-8000-000000000005",
      kind: "field",
      field: "customer_name",
      xMm: 3,
      yMm: 51,
      widthMm: 34,
      heightMm: 6,
      fontSizeMm: 3,
      bold: false,
      align: "left",
    },
  ],
};
