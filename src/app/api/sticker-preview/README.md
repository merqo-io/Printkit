# Sticker preview

Authenticated, rate-limited POST rendering of a validated sticker template using sample order data. The request is capped at 32 KiB; invalid geometry, overflow and unsupported logos produce errors rather than a cropped preview. This endpoint never creates a print job.
