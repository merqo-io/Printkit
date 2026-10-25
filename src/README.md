# src

## Purpose

The printkit application source.

## Contents

- `app/`: the App Router tree (landing, vendor dashboard, device and kit API routes, auth).
- `components/`, `hooks/`, `lib/`: UI, shared hooks and domain logic (connectors, job dispatch, printers).
- `assets/`: static assets bundled with the app.
- `proxy.ts`: Next 16 proxy. Refreshes the Supabase session, then sets the CSP (a per-request nonce on dynamic routes, the static policy elsewhere) and `X-Robots-Tag` off production. The source lists live in `lib/security-headers.ts`.

## Parent

[Printkit](../README.md)
