// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const reprintJobMock = vi.fn();
const toastSuccess = vi.fn();
vi.mock("./actions", () => ({
  reprintJob: (...args: unknown[]) => reprintJobMock(...args),
}));
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: vi.fn(),
  },
}));

import { ReprintButton } from "./reprint-button";

beforeEach(() => {
  reprintJobMock.mockReset().mockResolvedValue({ success: true });
  toastSuccess.mockReset();
});

describe("ReprintButton", () => {
  it("asks before printing and does not call the action on the first tap", () => {
    render(<ReprintButton jobId="job-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reprint" }));
    expect(screen.getByText("Print this label again?")).toBeInTheDocument();
    expect(reprintJobMock).not.toHaveBeenCalled();
  });

  it("cancel closes the question without printing", () => {
    render(<ReprintButton jobId="job-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reprint" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(reprintJobMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reprint" })).toBeVisible();
  });

  it("queues one label on a double tap of confirm and names the booth", async () => {
    render(<ReprintButton jobId="job-1" boothLabel="Kopitiam Cart" />);
    fireEvent.click(screen.getByRole("button", { name: "Reprint" }));
    const confirm = screen.getByRole("button", { name: "Yes, print" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(reprintJobMock).toHaveBeenCalledTimes(1);
    expect(reprintJobMock).toHaveBeenCalledWith("job-1");
    expect(toastSuccess.mock.calls[0][0]).toContain("Kopitiam Cart");
  });

  it("disables confirm while pending and recovers when the action throws", async () => {
    reprintJobMock.mockRejectedValueOnce(new Error("network unavailable"));
    render(<ReprintButton jobId="job-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Reprint" }));
    const confirm = screen.getByRole("button", { name: "Yes, print" });
    fireEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reprint" })).toBeEnabled(),
    );
  });
});
