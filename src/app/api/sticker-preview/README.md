# Sticker preview

Authenticated, rate-limited POST rendering of a validated sticker template using sample order data. The request is capped at 32 KiB; invalid geometry and overflow produce errors rather than a cropped preview. Logos are drawn, but only from the signed-in vendor's own storage folder; others are skipped. This endpoint never creates a print job.
