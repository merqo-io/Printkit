# pair

## Purpose

Where a Raspberry Pi agent trades a one-time pairing code for its own
device token.

## Contents

- `route.ts` — `POST {code}`. Redeems the code (8 characters, 10 minutes,
  single use) and returns a token that is stored only as a hash. Tested in
  `../route.test.ts`. Rate limited to 10 requests per IP per 60 seconds
  (429 beyond that, fails open if the limiter errors); `route.test.ts` here
  covers the limit.

## Parent

[bridge-agent](../README.md)

Public pairing JSON is capped at 16 KiB of streamed bytes before pairing storage is queried. Oversized input returns 413 even without Content-Length or with an understated value; malformed JSON returns 400.
