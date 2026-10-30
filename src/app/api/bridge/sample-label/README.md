# sample-label

## Purpose

The test print during Bluetooth setup, so the vendor checks the same label
an order will produce.

## Contents

- `route.ts` — `GET ?location=<id>`. Session-authenticated; renders a
  sample at the booth printer's own size and dpi.
- `route.test.ts` — 401 without a session, 400 for a missing or non-UUID
  `location` (nothing read), 404 for an unknown booth, 200 PNG otherwise.

## Parent

[bridge](../README.md)

The optional `sample=b1-40x60` selects an authenticated 40 by 60 mm calibration preview, using the same rasterizer as the bridge test print.
