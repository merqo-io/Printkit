import { z } from "zod";
export const passwordChangeSchema = z
  .object({
    // Supabase Auth owns the password policy, so the client states no length
    // or character rule that could drift from it.
    password: z.string().min(1, "Enter a new password."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match. Type the same one twice.",
    path: ["confirm"],
  });
