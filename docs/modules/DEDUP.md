# Dedup Stage — Implementation Brief for Antigravity

## Context

Stage 2 of the 7-stage alert proxy pipeline:

```
Ingest → Dedup → Lifecycle → Severity → Correlation → Batching → Cooldown → Routing
```

Dedup receives `NormalizedAlert` objects (per `alert.types.ts`) from Ingest. Its job
is narrow: recognize when an incoming alert is a repeat of one already in flight, and
suppress the repeat — without ever suppressing something that isn't actually a
duplicate, and without holding onto suppressed state past its useful life.

**Flapping detection is explicitly out of scope here** — that's Lifecycle's job.
Dedup only cares about "is this the same alert firing again," not "is this alert
oscillating between firing/resolved."

## Scope of this task: Dedup only

1. **Key every alert by its fingerprint** (set by Ingest's normalizer — Alertmanager's
   native fingerprint, or Ingest's derived hash for Datadog).
2. **Check Redis for an existing active entry** under that fingerprint.
   - **Not found** → this is a new alert. Create a Redis entry, set TTL per the
     severity-scaled table below, and pass the alert through to Lifecycle.
   - **Found** → this is a duplicate. Suppress it (do not forward to Lifecycle),
     increment the entry's duplicate counter, and refresh/reset its TTL.
3. **Never forward a duplicate onward.** Lifecycle only sees first-occurrence
   (and, later, resolution) events — not the noise in between. The suppressed count
   is retained in Redis so downstream stages (Batching, Routing) can later report
   "this fired 47 times" without having processed 47 individual events.

## Redis data model

Key: `dedup:{fingerprint}`
Value (hash): `{ severity, count, firstSeenAt, lastSeenAt, normalizedAlert (JSON) }`
TTL: per severity table below, reset on every duplicate hit.

Keep the Redis key naming and hash shape consistent with whatever's specified in the
`/docs/data-model` doc — if this is the first stage touching Redis, this is the
model to lock down, since Lifecycle/Cooldown will read from the same keys.

## TTL strategy: severity-scaled

TTL determines how long a "duplicate window" stays open before the same fingerprint
is treated as a brand-new alert again. Confirm exact values against the PRD/TRD, but
as a starting default:

| Severity | TTL     | Rationale                                          |
|----------|---------|-----------------------------------------------------|
| critical | 60s     | Short window — critical alerts should re-surface fast if they're still happening, so nothing catastrophic hides behind a long suppression |
| warning  | 5 min   | Longer tolerance for noisy, lower-stakes alerts     |
| info     | 15 min  | Longest — informational noise gets the most suppression |

This table needs to be a named constant/config (not magic numbers scattered in code)
since it's a tunable the team will likely adjust after seeing real traffic. Put it in
`src/dedup/config.ts` and reference it from `/docs/data-model`.

**Edge case to handle explicitly:** an alert's severity can itself change between
occurrences (e.g. Alertmanager relabels `warning` → `critical` mid-incident). Decide
whether TTL re-scaling on severity change is in scope for this pass — recommend:
yes, use the new severity's TTL on refresh, since a newly-critical alert shouldn't
stay suppressed under the old warning-length window.

## Zero missed critical alerts

- On Redis connection failure or lookup error, **fail open, not closed** — if Dedup
  can't reach Redis, forward the alert through rather than dropping it. Duplicate
  noise from a Redis outage is an acceptable cost; a missed critical alert is not.
- Log every fail-open event distinctly (e.g. `dedup.redis_unavailable`) so it's
  visible in metrics/alerting on the proxy's own health.
- Counter increments must not block the suppress decision — if the increment itself
  fails after the dedup check already succeeded, don't let that turn a duplicate into
  a false pass-through in either direction; log and continue.

## Deliverables for this task

- `src/dedup/index.ts` — core `dedupe(alert: NormalizedAlert): Promise<DedupResult>`
  entry point, called from Ingest's handoff
- `src/dedup/config.ts` — severity → TTL table as a named, exported constant
- `src/dedup/redisClient.ts` — thin Redis wrapper (get/set/incr/expire) scoped to
  dedup's key namespace, reusable by later stages if useful
- `src/dedup/types.ts` — `DedupResult` type (`{ isDuplicate: boolean, count: number,
  alert: NormalizedAlert }` or similar — confirm against `alert.types.ts` if this
  should live there instead)
- Unit tests covering: new alert, duplicate suppression + counter increment, TTL
  refresh, severity change mid-window, Redis-unavailable fail-open path

## Explicitly out of scope here

- Flapping / oscillation detection (Lifecycle)
- Correlation across different fingerprints (Correlation stage)
- Batching or routing decisions
- Cooldown windows (separate stage, different purpose than dedup TTL)
