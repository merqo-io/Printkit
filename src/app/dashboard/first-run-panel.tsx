import {
  SetupStepsEmpty,
  safeQkitUrl,
  type SetupStep,
} from "@/components/setup-steps-empty";
import { TextLink } from "@/components/text-link";

export type FirstRunProgress = {
  hasBooth: boolean;
  hasPrinter: boolean;
  hasPrintedJob: boolean;
};

/** Whether the vendor has finished every first-run step. */
function isFirstRunComplete(p: FirstRunProgress): boolean {
  return p.hasBooth && p.hasPrinter && p.hasPrintedJob;
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
  const raw: (SetupStep & { done: boolean })[] = [
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
      body: (
        <TextLink href="/dashboard/printers">Print your first label.</TextLink>
      ),
    },
  ];
  // A step only counts once every earlier step is done, so the marks stay in
  // order even when old jobs exist without a printer.
  const steps = raw.map((step, index) => ({
    ...step,
    done: raw.slice(0, index + 1).every((s) => s.done),
  }));

  return (
    <SetupStepsEmpty
      heading="Get your first label printing"
      headingId="first-run-heading"
      steps={steps}
    />
  );
}
