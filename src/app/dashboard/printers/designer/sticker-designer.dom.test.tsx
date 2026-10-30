// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const save = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ saveStickerDesign: save }));
import { StickerDesigner } from "./sticker-designer";

describe("sticker designer prototype", () => {
  it("shows the actual dimensions and sample order fields without claiming to save", () => {
    render(<StickerDesigner />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /does not use them yet/i,
    );
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
    fireEvent.blur(screen.getByLabelText("Width (mm)"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /outside the printable margins/i,
    );
    expect(screen.getByLabelText("Width (mm)")).toHaveValue(40);
    fireEvent.click(screen.getByRole("button", { name: "Reset preview" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("allows typing a new dimension before validating it", () => {
    render(<StickerDesigner />);
    const length = screen.getByLabelText("Length (mm)");
    fireEvent.change(length, { target: { value: "" } });
    fireEvent.change(length, { target: { value: "8" } });
    fireEvent.change(length, { target: { value: "80" } });
    fireEvent.blur(length);
    expect(screen.getByLabelText("Length (mm)")).toHaveValue(80);
    expect(
      screen.getByLabelText(/Sticker preview, 40 by 80/),
    ).toBeInTheDocument();
  });
  it("saves an owned booth design and clears the saved status after an edit", async () => {
    save.mockResolvedValueOnce({ ok: true });
    render(<StickerDesigner locationId="booth" />);
    fireEvent.click(screen.getByRole("button", { name: "Save design" }));
    expect(
      await screen.findByText("Design saved for this booth."),
    ).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith(
      "booth",
      expect.objectContaining({ widthMm: 40 }),
    );
    fireEvent.change(screen.getByLabelText("Left (mm)"), {
      target: { value: "4" },
    });
    expect(
      screen.queryByText("Design saved for this booth."),
    ).not.toBeInTheDocument();
  });
  it("shows a useful error when rendered sample content overflows", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "text_overflow" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      render(<StickerDesigner />);
      fireEvent.click(
        screen.getByRole("button", { name: "Render print preview" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /Some text does not fit/,
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/sticker-preview",
        expect.objectContaining({ method: "POST" }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("adds and removes an optional field and can undo the removal", () => {
    render(<StickerDesigner />);
    fireEvent.click(screen.getByRole("button", { name: "Add Booth name" }));
    expect(
      screen.getByRole("button", { name: "Select Booth name" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove field" }));
    expect(
      screen.queryByRole("button", { name: "Select Booth name" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.getByRole("button", { name: "Select Booth name" }),
    ).toBeInTheDocument();
  });
});
