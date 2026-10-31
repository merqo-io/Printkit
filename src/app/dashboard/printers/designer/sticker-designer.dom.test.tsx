// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  upload: vi.fn(),
  removeLogo: vi.fn(),
}));
const { save, upload, removeLogo } = mocks;
vi.mock("./actions", () => ({
  saveStickerDesign: mocks.save,
  uploadStickerLogo: mocks.upload,
  removeStickerLogo: mocks.removeLogo,
}));
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
  describe("logo", () => {
    const first = `${"a".repeat(8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png`;
    const second = first.replace(
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    );
    const pick = (label: string) =>
      fireEvent.change(screen.getByLabelText(label), {
        target: {
          files: [
            new File([new Uint8Array([1])], "logo.png", { type: "image/png" }),
          ],
        },
      });

    it("offers no upload without a booth", () => {
      render(<StickerDesigner />);
      expect(screen.queryByLabelText("Upload logo")).not.toBeInTheDocument();
    });
    it("uploads a logo, shows it in the preview and replaces it", async () => {
      upload
        .mockResolvedValueOnce({
          ok: true,
          path: first,
          url: "https://signed/1",
        })
        .mockResolvedValueOnce({
          ok: true,
          path: second,
          url: "https://signed/2",
        });
      removeLogo.mockResolvedValue({ ok: true });
      render(<StickerDesigner locationId="booth" />);
      pick("Upload logo");
      const image = await screen.findByAltText("Logo");
      expect(image.getAttribute("src")).toBe("https://signed/1");
      const body = upload.mock.calls[0][0] as FormData;
      expect(body.get("locationId")).toBe("booth");
      pick("Replace logo");
      await waitFor(() =>
        expect(screen.getByAltText("Logo").getAttribute("src")).toBe(
          "https://signed/2",
        ),
      );
      expect(removeLogo).toHaveBeenCalledWith("booth", first);
      expect(screen.getAllByAltText("Logo")).toHaveLength(1);
    });
    it("shows the server's reason when an upload is rejected", async () => {
      upload.mockResolvedValueOnce({
        ok: false,
        error: "The logo must be a PNG or JPEG.",
      });
      render(<StickerDesigner locationId="booth" />);
      pick("Upload logo");
      expect(await screen.findByRole("alert")).toHaveTextContent("PNG or JPEG");
      expect(screen.queryByAltText("Logo")).not.toBeInTheDocument();
    });
    it("removes the logo from the design and deletes the stored file", async () => {
      upload.mockResolvedValueOnce({
        ok: true,
        path: first,
        url: "https://signed/1",
      });
      removeLogo.mockResolvedValue({ ok: true });
      render(<StickerDesigner locationId="booth" />);
      pick("Upload logo");
      await screen.findByAltText("Logo");
      fireEvent.click(screen.getByRole("button", { name: "Remove logo" }));
      expect(screen.queryByAltText("Logo")).not.toBeInTheDocument();
      expect(removeLogo).toHaveBeenCalledWith("booth", first);
      expect(screen.getByLabelText("Upload logo")).toBeInTheDocument();
    });
    it("leaves the logo out of the text-only print preview", async () => {
      upload.mockResolvedValueOnce({
        ok: true,
        path: first,
        url: "https://signed/1",
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, json: async () => ({}) });
      vi.stubGlobal("fetch", fetchMock);
      try {
        render(<StickerDesigner locationId="booth" />);
        pick("Upload logo");
        await screen.findByAltText("Logo");
        fireEvent.click(
          screen.getByRole("button", { name: "Render print preview" }),
        );
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
          elements: { kind: string }[];
        };
        expect(sent.elements.some((element) => element.kind === "logo")).toBe(
          false,
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
