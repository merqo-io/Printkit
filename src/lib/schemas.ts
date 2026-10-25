import { z } from "zod";

export const feedbackSchema = z.object({
  nps: z.number().int().min(0).max(10),
  message: z.string().trim().max(2000).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const supportMessageSchema = z.object({
  category: z.enum(["printer", "account", "integration", "other"]),
  body: z.string().trim().min(1, "Tell us what's wrong").max(2000),
});
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;

export const SUPPORT_CATEGORY_LABELS: Record<
  SupportMessageInput["category"],
  string
> = {
  printer: "Printer / Bluetooth",
  account: "Account / sign-in",
  integration: "qkit connection",
  other: "Something else",
};

// Route/action boundaries

export const uuidSchema = z.uuid();

export const deviceTokenSchema = z.string().min(1).max(256);

export const catalogIdSchema = z.string().min(1).max(64);

export const cloudPrinterCredentialsSchema = z.object({
  sn: z.string().min(1).max(64),
  key: z.string().min(1).max(128),
});

export const feieCallbackFieldsSchema = z.object({
  orderId: z.string().min(1).max(128),
  status: z.string().max(64),
  sign: z.string().min(1).max(2048),
});
