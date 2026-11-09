// Routes that always render per request, so they can carry a CSP nonce.
export const NONCE_PREFIXES = [
  "/dashboard",
  "/auth",
  "/login",
  "/reset-password",
  "/legal/accept",
] as const;
