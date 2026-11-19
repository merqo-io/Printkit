import { submitFeedbackAction } from "@/app/actions/feedback";
import { submitSupportMessageAction } from "@/app/actions/support";
import { SUPPORT_CATEGORY_LABELS } from "@/lib/schemas";
import type { SupportMessageInput } from "@/lib/schemas";

type HelpCategory = SupportMessageInput["category"];

const HELP_CATEGORIES: { value: HelpCategory; label: string }[] =
  Object.entries(SUPPORT_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as HelpCategory,
    label,
  }));

function isHelpCategory(value: string | undefined): value is HelpCategory {
  return value !== undefined && HELP_CATEGORIES.some((c) => c.value === value);
}

/**
 * The Get help and Feedback adapters shared by the dashboard nav and the
 * public-page account menu, so both send the same support and NPS records.
 * The shared components show a failure when the handler throws, while the
 * actions return `{ success: false }`.
 */
export const GET_HELP = {
  type: "form" as const,
  categories: HELP_CATEGORIES,
  onSubmit: async ({
    message,
    category,
  }: {
    message: string;
    category?: string;
  }) => {
    const res = await submitSupportMessageAction({
      category: isHelpCategory(category) ? category : "other",
      body: message,
    });
    if (!res.success) throw new Error(res.error);
  },
};

export async function submitAccountFeedback({
  message,
  nps,
}: {
  message: string;
  nps?: number | null;
}): Promise<void> {
  const res = await submitFeedbackAction({
    nps: nps ?? 0,
    message: message.trim() || undefined,
  });
  if (!res.success) throw new Error(res.error);
}
