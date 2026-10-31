import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import {
  inspectLogo,
  LOGO_MAX_BYTES,
  LOGO_MAX_PIXELS,
} from "@/app/dashboard/printers/designer/logo-image";

type Rect = { x: number; y: number; width: number; height: number };
type Target = { drawImage: (image: never, x: number, y: number) => void };

// 4x4 Bayer matrix; ordered dither keeps tone in photos and logos with
// gradients, while pure black and white pixels always stay black and white.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Dithers RGBA pixels in place to pure black and white, ignoring alpha. */
export function ditherToBitmap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luminance =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const threshold = ((BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) * 255;
      const shade = luminance > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = shade;
      data[i + 3] = 255;
    }
  }
}

/**
 * Decodes an uploaded logo defensively: the header is checked before the
 * decoder runs, so an oversized or mislabeled file never reaches it.
 * Returns null for anything that is not a PNG or JPEG within the upload limits.
 */
export async function decodeLogo(bytes: Uint8Array): Promise<Image | null> {
  if (bytes.byteLength > LOGO_MAX_BYTES) return null;
  const info = inspectLogo(bytes);
  if (
    !info ||
    info.width < 1 ||
    info.height < 1 ||
    info.width > LOGO_MAX_PIXELS ||
    info.height > LOGO_MAX_PIXELS
  )
    return null;
  try {
    const image = await loadImage(Buffer.from(bytes));
    // The decoder's own size is authoritative over the header it was pre-checked against.
    if (image.width > LOGO_MAX_PIXELS || image.height > LOGO_MAX_PIXELS)
      return null;
    return image;
  } catch {
    return null;
  }
}

/**
 * Scales the logo into the box (contain, centered, aspect kept) over white
 * so transparency prints as paper, dithers it to 1-bit, then stamps it on
 * the label canvas.
 */
export function drawLogoBitmap(target: Target, image: Image, box: Rect): void {
  const canvas = createCanvas(box.width, box.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, box.width, box.height);
  const ratio = Math.min(box.width / image.width, box.height / image.height);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    Math.floor((box.width - width) / 2),
    Math.floor((box.height - height) / 2),
    width,
    height,
  );
  const pixels = ctx.getImageData(0, 0, box.width, box.height);
  ditherToBitmap(pixels.data, box.width, box.height);
  ctx.putImageData(pixels, 0, 0);
  target.drawImage(canvas as never, box.x, box.y);
}
