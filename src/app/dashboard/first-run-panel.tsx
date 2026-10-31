import type { ReactNode } from "react";
import { Panel } from "@/components/panel";
import { TextLink } from "@/components/text-link";
import { cn } from "@/lib/utils";

export type FirstRunProgress = {
  hasBooth: boolean;
  hasPrinter: boolean;
  hasPrintedJob: boolean;
};

/** Whether the vendor has finished every first-run step. */
export function isFirstRunComplete(p: FirstRunProgress): boolean {
  return p.hasBooth && p.hasPrinter && p.hasPrintedJob;
}

/** Only an http(s) URL is linked, so a bad env value never becomes a link. */
function safeQkitUrl(url: string | undefined): string | null {
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

/** Numbered setup steps for a vendor who has not printed a label yet. */
export function FirstRunPanel({
  progress,
  qkitUrl,
}: {
  progress: FirstRunProgress;
  qkitUrl?: string;
}) {
  if (isFirstRunComplete(progress)) return null;

  const qkit = safeQkitUrl(qkitUrl);
  const steps: { done: boolean; body: ReactNode }[] = [
    {
      done: progress.hasBooth,
      body: qkit ? (
        <>
          In <TextLink href={qkit}>qkit</TextLink>, turn on printing for your
          booth.
        </>
      ) : (
        "In qkit, turn on printing for your booth."
      ),
    },
    {
      done: progress.hasPrinter,
      body: <TextLink href="/dashboard/printers">Pick your printer.</TextLink>,
    },
    {
      done: progress.hasPrintedJob,
      body: <TextLink href="/dashboard/printers">Print a test label.</TextLink>,
    },
  ];
  const currentIndex = steps.findIndex((step) => !step.done);

  return (
    <Panel as="section" aria-labelledby="first-run-heading">
      <h2 id="first-run-heading" className="text-lg font-semibold">
        Get your first label printing
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
    </Panel>
  );
}
