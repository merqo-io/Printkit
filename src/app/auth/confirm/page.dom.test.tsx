// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}));

import AuthConfirmPage, { metadata } from "./page";

async function renderPage(params: Record<string, string>) {
  render(await AuthConfirmPage({ searchParams: Promise.resolve(params) }));
}

describe("/auth/confirm page", () => {
  it("renders a POST form carrying the token for a valid link", async () => {
    await renderPage({
      token_hash: "abc123",
      type: "recovery",
      next: "/dashboard",
    });
    const form = document.querySelector("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.getAttribute("action")).toBe("/auth/confirm/verify");
    expect(
      document.querySelector<HTMLInputElement>('input[name="token_hash"]')
        ?.value,
    ).toBe("abc123");
    expect(
      document.querySelector<HTMLInputElement>('input[name="type"]')?.value,
    ).toBe("recovery");
    expect(screen.queryByText("abc123")).not.toBeInTheDocument();
  });

  it("renders the invalid state for a missing or unknown link", async () => {
    await renderPage({ type: "bogus" });
    expect(document.querySelector("form")).toBeNull();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("never calls Supabase", async () => {
    await renderPage({ token_hash: "abc", type: "signup" });
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("is noindex and sends no referrer", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
