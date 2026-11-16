import type { Metadata } from "next";
import { AuthConfirmForm, AuthConfirmInvalid } from "@merqo/ui";
import { readAuthConfirmParams } from "@merqo/ui/auth";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = {
  title: "Confirm",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = readAuthConfirmParams(await searchParams);
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
        </div>
        {params ? (
          <AuthConfirmForm
            tokenHash={params.tokenHash}
            type={params.type}
            next={params.next ?? undefined}
          />
        ) : (
          <AuthConfirmInvalid />
        )}
      </div>
    </main>
  );
}
