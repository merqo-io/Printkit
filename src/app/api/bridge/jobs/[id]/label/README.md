# label

## Purpose

The label PNG for one job, for the Android bridge running in the vendor's
browser.

## Contents

- `route.ts` — `GET`. Session-authenticated; RLS decides whose job it is.
  See `../../../README.md`.
- `route.test.ts` — signed out, another vendor's job, no booth or printer,
  and the rendered PNG.

## Parent

[bridge](../../../README.md)

A job id that is not a UUID is a 404 without a database read.
