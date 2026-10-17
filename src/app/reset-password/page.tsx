import type { Metadata } from "next";
import { Wordmark } from "@/components/wordmark";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
