import type { ReactNode } from "react";
import { TextLink } from "@/components/text-link";
import { cn } from "@/lib/utils";

export type SetupStep = { done?: boolean; body: ReactNode };

/**
 * Dashed "nothing here yet" block with numbered steps, so the three places
 * that tell a vendor how to get printing started look and read the same.
 */
export function SetupStepsEmpty({
  heading,
  steps,
  headingId,
  className,
}: {
  heading: string;
  steps: SetupStep[];
  headingId?: string;
  className?: string;
}) {
  const currentIndex = steps.findIndex((step) => !step.done);
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "border-border bg-card rounded-xl border border-dashed p-5",
        className,
      )}
    >
      <h2 id={headingId} className="text-lg font-semibold">
        {heading}
      </h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const current = index === currentIndex;
          let srState = "";
          if (step.done) srState = " (done)";
          else if (current) srState = " (next)";
          return (
            <li key={index} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  step.done &&
                    "bg-primary text-primary-foreground border-primary",
                  current &&
                    "bg-magenta text-magenta-foreground border-magenta",
                  !step.done && !current && "text-muted-foreground",
                )}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span
                className={cn(step.done && "text-muted-foreground")}
                aria-current={current ? "step" : undefined}
              >
                {step.body}
                <span className="sr-only">{srState}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Only an http(s) URL is linked, so a bad env value never becomes a link. */
export function safeQkitUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

/** The steps for a vendor with no booth printing yet, worded the same everywhere. */
export function boothPrintingSteps(qkitUrl: string | undefined): SetupStep[] {
  const qkit = safeQkitUrl(qkitUrl);
  return [
    {
      body: qkit ? (
        <>
          In <TextLink href={qkit}>qkit</TextLink>, turn on printing for your
          booth.
        </>
      ) : (
        "In qkit, turn on printing for your booth."
      ),
    },
    { body: "Pick your printer here." },
    { body: "Print a test label." },
  ];
}
