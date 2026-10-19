// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { LEAVE_BRIDGE_MESSAGE, useLeaveGuard } from "./use-leave-guard";

let confirmSpy: ReturnType<typeof vi.spyOn>;
let afterGuard: ReturnType<typeof vi.fn<(event: Event) => void>>;

function link(href: string, attrs: Record<string, string> = {}) {
  const anchor = document.createElement("a");
  anchor.href = href;
  for (const [name, value] of Object.entries(attrs)) {
    anchor.setAttribute(name, value);
  }
  anchor.textContent = "go";
  document.body.append(anchor);
  return anchor;
}

/** Clicks the element and says whether the click reached the page. */
function click(element: Element, init: MouseEventInit = {}) {
  afterGuard.mockClear();
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  element.dispatchEvent(event);
  return { reached: afterGuard.mock.calls.length > 0, event };
}

beforeEach(() => {
  confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
  afterGuard = vi.fn<(event: Event) => void>((event) => event.preventDefault());
  document.addEventListener("click", afterGuard);
});

afterEach(() => {
  document.removeEventListener("click", afterGuard);
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("useLeaveGuard", () => {
  it("does nothing while no printer is paired", () => {
    renderHook(() => useLeaveGuard(false));
    const { reached } = click(link("/dashboard/history"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(reached).toBe(true);

    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });

  it("asks before following an in-app link and stays when the vendor cancels", () => {
    renderHook(() => useLeaveGuard(true));
    const { reached, event } = click(link("/dashboard/history"));
    expect(confirmSpy).toHaveBeenCalledWith(LEAVE_BRIDGE_MESSAGE);
    expect(reached).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets the link through when the vendor confirms", () => {
    confirmSpy.mockReturnValue(true);
    renderHook(() => useLeaveGuard(true));
    const { reached } = click(link("/dashboard/history"));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(reached).toBe(true);
  });

  it("asks for a click inside a link, such as on its icon", () => {
    renderHook(() => useLeaveGuard(true));
    const anchor = link("/dashboard");
    const icon = document.createElement("span");
    anchor.append(icon);
    click(icon);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a new tab", link.bind(null, "/dashboard", { target: "_blank" }), {}],
    ["a download", link.bind(null, "/file.png", { download: "" }), {}],
    ["a modified click", link.bind(null, "/dashboard"), { ctrlKey: true }],
    ["a middle click", link.bind(null, "/dashboard"), { button: 1 }],
    ["a same-page anchor", () => link("#steps"), {}],
  ])("does not ask for %s", (_name, make, init) => {
    renderHook(() => useLeaveGuard(true));
    click(make(), init);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("does not ask for a click outside any link", () => {
    renderHook(() => useLeaveGuard(true));
    const button = document.createElement("button");
    document.body.append(button);
    click(button);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm a reload or closed tab", () => {
    renderHook(() => useLeaveGuard(true));
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it("stops asking once the printer is no longer paired", () => {
    const { rerender } = renderHook(({ active }) => useLeaveGuard(active), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    click(link("/dashboard/history"));
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
