import { z } from "zod";
export const passwordChangeSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match. Type the same one twice.",
    path: ["confirm"],
  });
