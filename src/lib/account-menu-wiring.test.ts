import { beforeEach, describe, expect, it, vi } from "vitest";

const submitFeedbackAction = vi.hoisted(() => vi.fn());
const submitSupportMessageAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/feedback", () => ({ submitFeedbackAction }));
vi.mock("@/app/actions/support", () => ({ submitSupportMessageAction }));

import { GET_HELP, submitAccountFeedback } from "./account-menu-wiring";

beforeEach(() => {
  submitFeedbackAction.mockReset();
  submitSupportMessageAction.mockReset();
});

describe("GET_HELP", () => {
  it("offers the support categories", () => {
    expect(GET_HELP.categories.length).toBeGreaterThan(0);
  });

  it("sends a known category as is and an unknown one as other", async () => {
    submitSupportMessageAction.mockResolvedValue({ success: true });
    const known = GET_HELP.categories[0].value;
    await GET_HELP.onSubmit({ message: "hi", category: known });
    await GET_HELP.onSubmit({ message: "hi", category: "nope" });
    await GET_HELP.onSubmit({ message: "hi" });
    expect(submitSupportMessageAction.mock.calls.map((c) => c[0])).toEqual([
      { category: known, body: "hi" },
      { category: "other", body: "hi" },
      { category: "other", body: "hi" },
    ]);
  });

  it("throws the action error so the form can show it", async () => {
    submitSupportMessageAction.mockResolvedValue({
      success: false,
      error: "Too many messages",
    });
    await expect(GET_HELP.onSubmit({ message: "hi" })).rejects.toThrow(
      "Too many messages",
    );
  });
});

describe("submitAccountFeedback", () => {
  it("trims the message and defaults the score", async () => {
    submitFeedbackAction.mockResolvedValue({ success: true });
    await submitAccountFeedback({ message: "  " });
    await submitAccountFeedback({ message: " nice ", nps: 9 });
    expect(submitFeedbackAction.mock.calls.map((c) => c[0])).toEqual([
      { nps: 0, message: undefined },
      { nps: 9, message: "nice" },
    ]);
  });

  it("throws the action error", async () => {
    submitFeedbackAction.mockResolvedValue({ success: false, error: "No" });
    await expect(submitAccountFeedback({ message: "x" })).rejects.toThrow("No");
  });
});
