import { describe, it, expect } from "vitest";
import { getBluetoothSupport } from "./bluetooth-support";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const CHROME_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1";
const FIREFOX_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0";
const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function nav(fields: Record<string, unknown>): Navigator {
  return fields as unknown as Navigator;
}

describe("getBluetoothSupport", () => {
  it("reports iOS for iPhone Safari, which has no navigator.bluetooth", () => {
    expect(
      getBluetoothSupport(nav({ maxTouchPoints: 5 }), IPHONE_SAFARI, true),
    ).toBe("ios");
  });

  it("reports iOS for an iPad sending a Mac user agent", () => {
    expect(
      getBluetoothSupport(nav({ maxTouchPoints: 5 }), IPAD_DESKTOP_MODE, true),
    ).toBe("ios");
  });

  it("reports iOS for Chrome on iOS", () => {
    expect(
      getBluetoothSupport(nav({ maxTouchPoints: 5 }), CHROME_IOS, true),
    ).toBe("ios");
  });

  it("does not treat a real Mac as iOS", () => {
    expect(
      getBluetoothSupport(
        nav({ maxTouchPoints: 0, bluetooth: {} }),
        IPAD_DESKTOP_MODE,
        true,
      ),
    ).toBe("supported");
  });

  it("reports an unsupported browser for desktop Firefox", () => {
    expect(
      getBluetoothSupport(nav({ maxTouchPoints: 0 }), FIREFOX_DESKTOP, true),
    ).toBe("unsupported-browser");
  });

  it("reports supported for desktop Chrome with navigator.bluetooth", () => {
    expect(
      getBluetoothSupport(nav({ bluetooth: {} }), CHROME_DESKTOP, true),
    ).toBe("supported");
  });

  it("reports an insecure context before checking the API", () => {
    expect(
      getBluetoothSupport(nav({ bluetooth: {} }), CHROME_DESKTOP, false),
    ).toBe("insecure-context");
  });

  it("reports an unsupported browser when there is no navigator", () => {
    expect(getBluetoothSupport(undefined, "", true)).toBe(
      "unsupported-browser",
    );
  });
});
