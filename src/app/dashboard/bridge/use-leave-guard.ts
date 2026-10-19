"use client";

import { useEffect } from "react";

export const LEAVE_BRIDGE_MESSAGE =
  "Leave Bridge mode? This device stops printing orders until you come back and pair the printer again.";

/** A same-origin link click that would move this tab to another page. */
function leavingLink(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  const next = new URL(anchor.href, window.location.href);
  return !(
    next.origin === window.location.origin &&
    next.pathname === window.location.pathname &&
    next.search === window.location.search
  );
}

/**
 * Asks before the vendor leaves the page while a printer is paired, because
 * leaving drops the Bluetooth connection and orders stop printing. Covers a
 * reload or closed tab (`beforeunload`) and in-app links, which Next.js
 * handles without unloading the page. The browser back button is not
 * covered: the App Router offers no way to cancel it.
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    // Capture phase, so this runs before Next's Link handler and can stop it.
    const onClick = (event: MouseEvent) => {
      if (!leavingLink(event)) return;
      if (window.confirm(LEAVE_BRIDGE_MESSAGE)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}
