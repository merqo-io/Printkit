/**
 * Plain-language text for print_jobs.failure_reason. Vendors never see the
 * raw code; an unknown or missing reason still gets a sentence that says what
 * to do next.
 */
const FAILURE_COPY: Record<string, string> = {
  expired:
    "The printer did not pick this label up in time. Check it is on and online, then print again.",
  printer_offline:
    "The printer was offline. Switch it on and check its connection, then print again.",
  driver_error:
    "The printer could not take this label. Check the paper and the lid, then print again.",
  device_reported_error:
    "The printer reported a problem, such as no paper or an open lid. Fix it, then print again.",
};

export const FAILURE_FALLBACK =
  "This label did not print. Check the printer, then print again.";

export function failureReasonText(reason: string | null): string {
  return reason !== null && Object.hasOwn(FAILURE_COPY, reason)
    ? FAILURE_COPY[reason]
    : FAILURE_FALLBACK;
}
