# label

## Purpose

The label PNG for a job the agent has already claimed.

## Contents

- `route.ts` — `GET`, bearer device token. Refuses a job that is not this
  printer's or not in `sent`. Tested in `../../../route.test.ts`.

## Parent

[bridge-agent](../../../README.md)

The job id is parsed as a UUID before the read.

## Rate limits

Per-IP before the agent token is resolved: 240 requests per 60 seconds (gent-ip:<ip>; the agent polls next-job 20 times a minute). Over the limit: 429 with Retry-After: 60. A limiter outage fails open.
