// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { WaitingForPrinter } from "./setup-step";

const readPrinterStateMock = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({
  readPrinterState: (...args: unknown[]) => readPrinterStateMock(...args),
}));
vi.mock("../actions", () => ({ sendTestPrint: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  readPrinterStateMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WaitingForPrinter", () => {
  it("stops polling once the printer is online", async () => {
    readPrinterStateMock.mockResolvedValue("online");
    render(<WaitingForPrinter locationId="loc-1" />);
    await act(async () => vi.advanceTimersByTimeAsync(4100));
    expect(await screen.findByText(/connected/i)).toBeInTheDocument();
    const callsWhenOnline = readPrinterStateMock.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(20_000));
    expect(readPrinterStateMock).toHaveBeenCalledTimes(callsWhenOnline);
  });

  it("keeps polling while the printer is offline", async () => {
    readPrinterStateMock.mockResolvedValue("offline");
    render(<WaitingForPrinter locationId="loc-1" />);
    await act(async () => vi.advanceTimersByTimeAsync(12_100));
    expect(readPrinterStateMock.mock.calls.length).toBeGreaterThan(2);
  });
});
