export type BluetoothSupport =
  "supported" | "ios" | "unsupported-browser" | "insecure-context";

// iPadOS 13+ reports a Mac user agent; touch points tell it apart from a Mac.
function isIos(nav: Navigator | undefined, ua: string): boolean {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && (nav?.maxTouchPoints ?? 0) > 1;
}

/**
 * Apple ships no Web Bluetooth in any iOS browser (Chrome for iOS included),
 * so iOS is reported before the generic missing-API case.
 */
export function getBluetoothSupport(
  nav: Navigator | undefined,
  ua: string,
  secureContext: boolean = globalThis.isSecureContext ?? true,
): BluetoothSupport {
  if (isIos(nav, ua)) return "ios";
  if (!secureContext) return "insecure-context";
  if (!nav || !("bluetooth" in nav) || !nav.bluetooth) {
    return "unsupported-browser";
  }
  return "supported";
}
