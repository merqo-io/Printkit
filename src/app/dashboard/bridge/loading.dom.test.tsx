// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import BridgeLoading from "./loading";

it("announces that Bridge is loading", () => {
  render(<BridgeLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading");
});
