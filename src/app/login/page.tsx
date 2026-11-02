"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { authNextCookie } from "@/lib/auth-return";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import { ElevatedCard } from "@/components/elevated-card";
import { GoogleMark } from "@merqo/ui";

const DEFAULT_RETURN_PATH = "/dashboard";

const OAUTH_ERROR_MESSAGE =
  "Something went wrong signing in with Google. Please try again.";

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
        setError(error.message);
        setBusy(false);
      }
    } catch {
      setError("Could not sign in with Google. Please try again.");
      setBusy(false);
    }
  }

  // The callback recognises the reset link's code exchange and opens the form.
  async function sendReset() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Password reset link sent to ${email}.`);
    } catch {
      toast.error("Could not send a reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
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

  const submitLabel = busy ? "Please wait…" : "Sign in";

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-3xl" />
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your printer connection and print jobs.
          </p>
        </div>

        <ElevatedCard>
          <div className="px-7 pt-9 pb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to your printkit dashboard.
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
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                or with email
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@business.sg"
                  className="h-11 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={sendReset}
                    disabled={busy}
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 rounded-xl"
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
            printkit is the print companion for qkit booths. New vendors start
            with qkit.
          </p>
        </ElevatedCard>
      </div>
    </main>
  );
}
