# Sticker designer prototype

The authenticated page contains a temporary client-side canvas for experimenting with physical dimensions and field placement. It validates geometry using `sticker-template.ts`, supports pointer movement and numeric position controls, and shows sample content. Changes are not saved or used for printing. Storage, renderer parity, logo upload, accessible editing, overflow detection, and printer compatibility are future work; do not deploy this prototype as a finished designer.

The Render print preview button uses the authenticated thermal preview endpoint. It does not print or save a design.
