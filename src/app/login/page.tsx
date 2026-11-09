"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  oauthErrorMessage,
  resetErrorMessage,
  signInErrorMessage,
} from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@merqo/ui";
import { authNextCookie } from "@/lib/auth-return";
import { Button } from "@merqo/ui/primitives";
import { Input } from "@merqo/ui/primitives";
import { Label } from "@merqo/ui/primitives";
import { Wordmark } from "@/components/wordmark";
import { ElevatedCard, GoogleMark } from "@merqo/ui";

const DEFAULT_RETURN_PATH = "/dashboard";

const OAUTH_ERROR_MESSAGE =
  "Could not sign in with Google. Try again in a minute.";

const emailSchema = z.string().trim().email();
const EMAIL_ERROR = "Enter a valid email, like you@business.sg.";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth" ? OAUTH_ERROR_MESSAGE : null,
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setError(null);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl(),
          queryParams: { hl: "en" },
        },
      });
      if (error) {
        setError(oauthErrorMessage(error));
        setBusy(false);
      }
    } catch {
      setError(OAUTH_ERROR_MESSAGE);
      setBusy(false);
    }
  }

  // The callback recognises the reset link's code exchange and opens the form.
  async function sendReset() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(EMAIL_ERROR);
      return;
    }
    const cleanEmail = parsed.data;
    setEmailError(null);
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        toast.error(resetErrorMessage(error));
        return;
      }
      toast.success(`Reset link sent to ${cleanEmail}. Check your inbox.`);
    } catch {
      toast.error("Could not send a reset link. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(EMAIL_ERROR);
      return;
    }
    setEmailError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data,
        password,
      });
      if (error) {
        setError(signInErrorMessage(error));
        setBusy(false);
        return;
      }
      router.push(returnPath());
      router.refresh();
    } catch {
      setError("Could not sign in. Check your connection and try again.");
      setBusy(false);
    }
  }

  const submitLabel = busy ? "Signing in…" : "Sign in";

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
          <p className="mt-1 text-sm text-muted-foreground">
            New to printkit? Start in qkit.
          </p>
        </div>

        <ElevatedCard>
          <div className="px-7 pt-9 pb-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to manage your printers and print jobs.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={signInWithGoogle}
              disabled={busy}
              className="mt-7 h-12 w-full gap-2.5 rounded-xl text-[0.95rem] font-medium"
            >
              <GoogleMark />
              Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-sm text-muted-foreground">
                or use email
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} noValidate className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@business.sg"
                  className="h-11 rounded-xl text-base"
                  value={email}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? "email-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                />
                {emailError && (
                  <p id="email-error" className="text-sm text-destructive">
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={sendReset}
                    disabled={busy}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-xl text-base font-semibold"
                disabled={busy}
              >
                {submitLabel}
              </Button>
            </form>
          </div>

          <div className="border-t" />
          <p className="px-7 py-4 text-center text-sm text-muted-foreground">
            printkit is the print companion for qkit booths.
          </p>
        </ElevatedCard>
      </div>
    </main>
  );
}
