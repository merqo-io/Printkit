// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { AutoRefresh } from "./auto-refresh";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

describe("AutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
    setVisibility("visible");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes every 30 seconds while visible", () => {
    render(<AutoRefresh />);
    act(() => vi.advanceTimersByTime(29_999));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(30_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does not refresh while the tab is hidden", () => {
    render(<AutoRefresh />);
    setVisibility("hidden");
    act(() => vi.advanceTimersByTime(90_000));
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes when the window regains focus", () => {
    render(<AutoRefresh />);
    act(() => vi.advanceTimersByTime(5_000));
    window.dispatchEvent(new Event("focus"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes once when focus and visibilitychange fire together", () => {
    render(<AutoRefresh />);
    act(() => vi.advanceTimersByTime(5_000));
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops everything on unmount", () => {
    const { unmount } = render(<AutoRefresh />);
    unmount();
    act(() => vi.advanceTimersByTime(60_000));
    window.dispatchEvent(new Event("focus"));
    expect(refresh).not.toHaveBeenCalled();
  });
});
