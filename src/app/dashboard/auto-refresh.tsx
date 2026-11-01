"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 30_000;
// A tab switch fires focus and visibilitychange together; one refresh is enough.
const MIN_GAP_MS = 1_000;

/**
 * Re-runs the page's server render so printer state and job status do not go
 * stale. Refreshes when the tab regains focus and every 30 s while visible;
 * a hidden tab never refreshes.
 */
export function AutoRefresh({
  intervalMs = INTERVAL_MS,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      router.refresh();
    };

    const timer = setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
