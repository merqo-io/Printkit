export const LOGO_BUCKET = "sticker-logos";
export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_MAX_PIXELS = 1024;

export type LogoImage = {
  ext: "png" | "jpg";
  contentType: "image/png" | "image/jpeg";
  width: number;
  height: number;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// SOF markers carry the frame size; DHT (C4), JPG (C8) and DAC (CC) share the range but do not.
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readPng(bytes: Uint8Array): LogoImage | null {
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value))
    return null;
  // The first chunk must be IHDR, which holds big-endian width and height.
  const type = String.fromCharCode(...bytes.slice(12, 16));
  if (bytes.length < 24 || type !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    ext: "png",
    contentType: "image/png",
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function readJpeg(bytes: Uint8Array): LogoImage | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (SOF_MARKERS.has(marker)) {
      if (offset + 9 > bytes.length) return null;
      return {
        ext: "jpg",
        contentType: "image/jpeg",
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }
    // Start of scan or end of image before a frame header means the file is malformed.
    if (marker === 0xda || marker === 0xd9) return null;
    offset += 2 + view.getUint16(offset + 2);
  }
  return null;
}

// Decides the type from magic bytes; the declared MIME type is never trusted.
export function inspectLogo(bytes: Uint8Array): LogoImage | null {
  return readPng(bytes) ?? readJpeg(bytes);
}
