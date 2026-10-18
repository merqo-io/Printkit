# error

## Purpose

`/dev/ui-states/error`: proves the dashboard error page in real Next.js.
While the `ui-states-fail` cookie is `1` the page throws from the server;
otherwise it renders "Page rendered." (`data-testid="ui-states-recovered"`).

## Contents

- `page.tsx` — the Server Component that throws by cookie. Tab title
  "Error page preview".
- `error.tsx` — re-exports `src/app/dashboard/error.tsx`, so the boundary
  under test is the real one.

## Parent

[ui-states](../README.md)
