/* eslint-disable no-restricted-syntax -- ImageResponse needs literal CSS colours */
import type { ReactElement } from "react";

// sRGB of the light-theme --primary, --background and --magenta tokens.
export const BRAND_INK = "#1E1F24";
export const BRAND_PAPER = "#F7F5F1";
export const BRAND_MAGENTA = "#CA358B";

/**
 * The printkit "P" app mark: a paper "P" on ink with a magenta registration dot for ImageResponse-generated icons (favicon,
 * apple-touch). printkit's display font is Fraunces (shared family face, see
 * docs/business/2026-08-13-typography-family-standard.md), a serif, so this
 * uses the same Georgia stand-in as the rest of the family.
 */
export function brandIcon(size: number): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: BRAND_INK,
        color: BRAND_PAPER,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontWeight: 700,
        fontSize: size * 0.62,
        lineHeight: 1,
        borderRadius: size * 0.22,
      }}
    >
      P
      <div
        style={{
          position: "absolute",
          right: size * 0.14,
          bottom: size * 0.14,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size,
          background: BRAND_MAGENTA,
        }}
      />
    </div>
  );
}
