import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Development-only frame for rendering dashboard states without a session. */
export default function UiStatesLayout({ children }: { children: ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-6 pt-8 pb-16">
      <p
        data-testid="ui-states-frame"
        className="text-muted-foreground mb-6 font-mono text-xs"
      >
        Development preview
      </p>
      {children}
    </main>
  );
}
