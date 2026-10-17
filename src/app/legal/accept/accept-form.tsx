"use client";

import { useState } from "react";
import { TermsAcceptanceCheckbox } from "@merqo/ui";
import { Button } from "@/components/ui/button";
import { acceptLegalTerms } from "./actions";

export function AcceptForm({ next }: { next: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <form action={acceptLegalTerms} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <TermsAcceptanceCheckbox checked={checked} onCheckedChange={setChecked} />
      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-xl text-base font-semibold"
        disabled={!checked}
      >
        Continue
      </Button>
    </form>
  );
}
