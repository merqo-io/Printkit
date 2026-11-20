import { expect, it, vi } from "vitest";

const submitSupportMessageAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/support", () => ({ submitSupportMessageAction }));

import { submitLandingSupportAction } from "./landing-account";

it("renames message to body for the support action", async () => {
  submitSupportMessageAction.mockResolvedValue({ success: true });
  const res = await submitLandingSupportAction({
    category: "printer",
    message: "Won't print",
  });
  expect(submitSupportMessageAction).toHaveBeenCalledWith({
    category: "printer",
    body: "Won't print",
  });
  expect(res).toEqual({ success: true });
});
