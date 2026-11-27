# DESIGN.md: printkit

Design notes for printkit, the hardware print connector for Merqo vendors (in build).

## Public pages

Public pages (about, guides, legal) follow the shared rules at https://github.com/merqo-io/merqo-ui/blob/main/docs/public-page-rules.md. This section never restates them; it only adds printkit's own values.

- **Routes covered:** `/`, `/about`, `/guides/*` (today `/guides/bluetooth-printers`) and `/legal/*` (`privacy`, `terms`, `accept`).
- **Landing (`/`):** signed-out visitors get a landing (`src/app/page.tsx`, built from `src/components/landing/`): an "In build" hero with a print demo (`hero.tsx`), a 3-step journey (`print-journey.tsx`), 3 FAQ rows and a closing Sign in call (`sections.tsx`). Signed-in visitors redirect to `/dashboard`. There is no `/faq` route; do not add one from the shared rules.
- **Radius:** `--radius` is `0.625rem` (`src/app/globals.css:11`).
- **Product objects:** none on the public pages.
- **Open:**
  - `src/components/notice.tsx:29`: the `Notice` box is `rounded-xl`, not the one small surface radius. It renders on `/guides/bluetooth-printers` (`src/app/guides/bluetooth-printers/page.tsx:64`).
  - `src/app/legal/accept/page.tsx:30`: `ElevatedCard` from `@merqo/ui` is `rounded-2xl` with `shadow-md` on page content.
  - `src/app/legal/accept/accept-form.tsx:25` and `src/app/legal/accept/accept-form.tsx:35`: the buttons are `rounded-xl`, not the small surface radius.
  - Grepped and found nothing else: `shadow-`, `rounded-2xl`, `rounded-xl`, `rounded-[`, hover lift, scale or glow, `fade-rise`, `animate-` and timers across `src/app/about`, `src/app/guides`, `src/app/legal`, `site-nav`, `site-footer`, `text-link`, `wordmark`, `steps` and the shared `AboutMerqo`, `LegalDocument` and `BackToTop`.
