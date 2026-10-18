import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Error page preview",
};

const FAIL_COOKIE = "ui-states-fail";

/** Throws from a Server Component while the fail cookie is set. */
export default async function ErrorPreviewPage() {
  const store = await cookies();
  if (store.get(FAIL_COOKIE)?.value === "1") {
    throw new Error("ui-states: simulated server render failure");
  }

  return <p data-testid="ui-states-recovered">Page rendered.</p>;
}
