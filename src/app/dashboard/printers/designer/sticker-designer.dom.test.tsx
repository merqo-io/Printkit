// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StickerDesigner } from "./sticker-designer";

describe("sticker designer prototype", () => {
  it("shows the actual dimensions and sample order fields without claiming to save", () => {
    render(<StickerDesigner />);
    expect(screen.getByRole("status")).toHaveTextContent(/not saved/i);
    expect(screen.getByLabelText("Width (mm)")).toHaveValue(40);
    expect(screen.getByLabelText("Length (mm)")).toHaveValue(60);
    expect(
      screen.getByRole("button", { name: "Select Drink options" }),
    ).toHaveTextContent("Normal sugar");
  });
  it("lets a vendor select a field and use accessible numeric position controls", () => {
    render(<StickerDesigner />);
    fireEvent.click(screen.getByRole("button", { name: "Drink options" }));
    fireEvent.change(screen.getByLabelText("Left (mm)"), {
      target: { value: "4" },
    });
    expect(screen.getByLabelText("Left (mm)")).toHaveValue(4);
  });
  it("rejects a size that would clip fields, and can reset the preview", () => {
    render(<StickerDesigner />);
    fireEvent.change(screen.getByLabelText("Width (mm)"), {
      target: { value: "20" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /outside the printable margins/i,
    );
    expect(screen.getByLabelText("Width (mm)")).toHaveValue(40);
    fireEvent.click(screen.getByRole("button", { name: "Reset preview" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
