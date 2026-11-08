// @vitest-environment jsdom
import { Button } from "@merqo/ui/primitives";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

// jsdom has no pointer media queries, so assert the coarse-pointer class that
// lifts each size to the 44px touch minimum vendors rely on.
const sizes = [
  ["default", "pointer-coarse:h-11"],
  ["xs", "pointer-coarse:h-11"],
  ["sm", "pointer-coarse:h-11"],
  ["lg", "pointer-coarse:h-12"],
  ["icon", "pointer-coarse:size-11"],
  ["icon-xs", "pointer-coarse:size-11"],
  ["icon-sm", "pointer-coarse:size-11"],
  ["icon-lg", "pointer-coarse:size-11"],
] as const;

it.each(sizes)("size %s is at least 44px on coarse pointers", (size, cls) => {
  render(<Button size={size}>x</Button>);
  expect(screen.getByRole("button")).toHaveClass(cls);
});
