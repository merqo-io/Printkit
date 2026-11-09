"use client";

import { useState } from "react";
import { TermsAcceptanceCheckbox } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { signOutAction } from "@/app/actions/auth";
import { acceptLegalTerms } from "./actions";

export function AcceptForm({ next }: { next: string }) {
  const [checked, setChecked] = useState(false);

  // The sign-out form is a sibling, not nested: forms cannot nest, and a
  // visitor who declines the terms needs a way out of this page.
  return (
    <div className="space-y-3">
      <form action={acceptLegalTerms} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <TermsAcceptanceCheckbox
          checked={checked}
          onCheckedChange={setChecked}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={!checked}
        >
          Accept and continue
        </Button>
      </form>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full rounded-xl"
        >
          Sign out instead
        </Button>
      </form>
    </div>
  );
}
