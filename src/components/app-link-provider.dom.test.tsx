// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AppLinks } from "./app-link-provider";

it("renders its children", () => {
  render(
    <AppLinks>
      <p>inside</p>
    </AppLinks>,
  );
  expect(screen.getByText("inside")).toBeTruthy();
});
