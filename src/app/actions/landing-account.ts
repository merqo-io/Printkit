"use server";
import { submitSupportMessageAction } from "@/app/actions/support";
import type { ActionResult } from "@merqo/ui/kit-api";

/**
 * `LandingAccountNav` sends the support text as `message`, while printkit's
 * support action validates it as `body`.
 */
export async function submitLandingSupportAction(input: {
  category: string;
  message: string;
}): Promise<ActionResult> {
  return submitSupportMessageAction({
    category: input.category,
    body: input.message,
  });
}
