# dev

## Purpose

Development-only routes outside `/dashboard`, so they render without a
Supabase session. Every route here returns 404 when
`VERCEL_ENV === "production"`. Nothing links to them.

## Contents

- `ui-states/` — real dashboard components in states production rarely
  shows, for the Playwright check — see its own README.

## Parent

[app](../README.md)
