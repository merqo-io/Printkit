"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthShell,
  LoginForm,
  authErrorMessage,
  navigatingAway,
  safeRedirectPath,
  type LoginCredentials,
} from "@merqo/ui";
import { createClient } from "@/lib/supabase/client";
import { authNextCookie } from "@/lib/auth-return";
import { Wordmark } from "@/components/wordmark";

const DEFAULT_RETURN_PATH = "/dashboard";

const URL_ERROR_MESSAGES = new Map([
  ["oauth", "Could not sign in with Google. Try again in a minute."],
  ["link", "That link is invalid or has expired. Request a new one."],
]);

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A URL fragment never reaches the server, but the browser carries it across
  // the proxy's redirect to this page. It is put back on a valid `next`, so a
  // link to one row of a page still names that row after sign-in.
  function returnPath(): string {
    const next = safeRedirectPath(
      searchParams.get("next"),
      DEFAULT_RETURN_PATH,
    );
    if (next === DEFAULT_RETURN_PATH || next.includes("#")) return next;
    return safeRedirectPath(next + window.location.hash, next);
  }

  // Supabase only honours an exact allowed Redirect URL, so the callback URL
  // stays bare and the return path rides in a short-lived cookie instead.
  function authCallbackUrl(): string {
    const next = returnPath();
    document.cookie = authNextCookie(
      next === DEFAULT_RETURN_PATH ? null : next,
      window.location.protocol === "https:",
    );
    return `${window.location.origin}/auth/callback`;
  }

  async function signInWithGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authCallbackUrl(),
        queryParams: { hl: "en" },
      },
    });
    if (error) return { error };
  }

  // The callback recognises the reset link's code exchange and opens the form.
  async function sendReset(email: string) {
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) return { error };
    return { notice: `Reset link sent to ${email}. Check your inbox.` };
  }

  async function signIn({ email, password }: LoginCredentials) {
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error };
    router.push(returnPath());
    router.refresh();
    await navigatingAway();
  }

  return (
    <AuthShell
      wordmark={<Wordmark className="text-3xl" />}
      tagline="New to printkit? Start in qkit."
      title="Welcome back"
      subtitle="Sign in to manage your printers and print jobs."
      footer="printkit is the print companion for qkit booths."
    >
      <LoginForm
        onPasswordSignIn={signIn}
        onGoogleSignIn={signInWithGoogle}
        onForgotPassword={sendReset}
        emailPlaceholder="you@business.sg"
        initialError={
          URL_ERROR_MESSAGES.get(searchParams.get("error") ?? "") ?? undefined
        }
        mapErrorObject={(error, context) => authErrorMessage(error, context)}
      />
    </AuthShell>
  );
}
