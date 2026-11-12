import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const reset = vi.fn();
const GlobalErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@merqo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@merqo/ui")>();
  GlobalErrorMock.mockImplementation(actual.GlobalError);
  return { ...actual, GlobalError: GlobalErrorMock };
});

import GlobalErrorPage from "./global-error";

it("renders the fallback copy and a retry button inside a main landmark", () => {
  const html = renderToStaticMarkup(<GlobalErrorPage retry={reset} />);

  expect(html).toContain("<html");
  expect(html).toContain("<main");
  expect(html).toMatch(/something went wrong/i);
  expect(html).toMatch(/<button[^>]*>Try again<\/button>/);
});

it("wires Next's retry into the shared page's reset", () => {
  renderToStaticMarkup(<GlobalErrorPage retry={reset} />);

  const props = GlobalErrorMock.mock.calls.at(-1)?.[0] as { reset: () => void };
  props.reset();
  expect(reset).toHaveBeenCalledTimes(1);
});
