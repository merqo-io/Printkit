# Sticker designer

The authenticated, booth-scoped editor supports sticker dimensions, field positioning, typography, and a thermal-rendered sample preview. Vendors can save versioned designs after the owner applies the migration. The save action checks ownership, geometry, printer width, and sample overflow.

Order printing does not yet use saved designs. Printing logos, full printer compatibility, and live-order overflow handling remain unfinished. The sample preview never sends a print job.

## Logos

A vendor can upload one PNG or JPEG logo (512 KB and 1024 by 1024 pixels at most) and place it as a `logo` element. `uploadStickerLogo` decides the type from magic bytes, reads the pixel size from the PNG or JPEG header (`logo-image.ts`), and stores the file with the service role at `<vendor_id>/<booth_id>/<uuid>.<png|jpg>` in the private `sticker-logos` bucket. The template holds only that storage path. The page signs short-lived URLs with the vendor session so bucket RLS decides what is visible. `removeStickerLogo` deletes the file unless a saved version still uses it, and `saveStickerDesign` refuses logos outside the vendor and booth folder or missing from storage.

Logos show in the editor but are not drawn into printed output or the print preview yet.
