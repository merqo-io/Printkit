import type { Metadata } from "next";

// Rendered per request so the nonce CSP from proxy.ts reaches its scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
