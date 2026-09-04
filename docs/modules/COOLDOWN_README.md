# Adaptive Cooldown — Implementation Brief for Antigravity

## Context

```
Batching → Adaptive Cooldown → Router → PagerDuty / Slack / Email-Discord
```

Cooldown receives batched (or bypassed-critical) incidents from Batching. Its job
is the last line of noise reduction before Router: prevent the *same* incident
from re-notifying too frequently, even across separate batch windows or separate
critical bypasses. Where Batching groups things arriving close together in time,
Cooldown limits how often notifications repeat over a longer horizon for the same
underlying fingerprint/incident.

## Adaptive = severity-scaled cooldown duration

- Cooldown duration is a function of severity, not fixed:
  - **Critical**: no or minimal cooldown (e.g. 0–30s, just enough to prevent literal
    duplicate sends from a race, not meant to suppress legitimate repeat
    notifications). Critical incidents already bypassed Batching — Cooldown must
    not become a backdoor way to silence them either.
  - **Warning/medium**: moderate cooldown (config constant, e.g. 5–10 min).
  - **Info/low**: longer cooldown (config constant, e.g. 30+ min).
- Make each tier a named constant in `src/cooldown/config.ts`
  (`COOLDOWN_MS_CRITICAL`, `COOLDOWN_MS_WARNING`, `COOLDOWN_MS_INFO`) — these are
  tunable values the team will adjust after seeing real notification volume.
- Cooldown is keyed by the incident's fingerprint (same identity concept used
  since Dedup/Lifecycle) — so cooldown tracks "have we already notified about
  *this* problem recently," not a global rate limit across all incidents.

## Suppression during active cooldown: no exception

- If a notification would fire for a fingerprint that's still within its cooldown
  window, it is **suppressed outright** — not delayed, not modified, not allowed
  through even if new information arrived (e.g. new contributing alerts joined the
  incident via Correlation, or AI enrichment changed). This was explicitly decided
  as "no exception," so don't build in a content-changed override even though
  that's a common pattern elsewhere — this system deliberately keeps Cooldown's
  rule simple and absolute.
- Suppressed notifications should still be **counted**, not silently discarded —
  track a suppression counter per fingerprint (similar to Dedup's duplicate
  counter) so if this incident eventually does notify again (cooldown expired),
  the notification can reflect how much happened during the quiet period (e.g.
  "3 additional occurrences suppressed during cooldown").
- This is a genuinely different suppression from Dedup's — Dedup suppresses exact
  repeat deliveries within seconds; Cooldown suppresses legitimate repeat
  *notifications* over minutes, specifically to protect on-call from being paged
  repeatedly about something they've already been told about.

## Redis-backed state (horizontal scaling)

- `cooldown:{fingerprint}` — Redis key with TTL set to the severity-appropriate
  cooldown duration. Presence of the key = "in cooldown." Natural fit for Redis TTL
  expiry rather than manual timestamp comparison — once the key expires, the next
  incident for that fingerprint passes through cleanly with no extra logic needed.
- Suppression counter: increment a separate field/key on each suppressed attempt
  (e.g. `cooldown:{fingerprint}:suppressed_count`, sharing the same TTL or a
  slightly longer one so the count is still readable at expiry time for the
  eventual "N suppressed" message).
- No distributed locking required — Redis's atomic INCR/SET-with-TTL is enough to
  keep this correct across multiple instances without extra coordination.

## Deliverables for this task

- `src/cooldown/index.ts` — `applyCooldown(incidentOrBatch): Promise<CooldownResult>`
  entry point, called from Batching's output path (both the immediate critical
  path and the batched-flush path funnel through here)
- `src/cooldown/config.ts` — severity → cooldown duration constants
- `src/cooldown/store.ts` — Redis-backed cooldown key + suppression counter logic
- `src/cooldown/types.ts` — `CooldownResult` (`{ allowed: boolean, suppressedCount?:
  number }` or similar)
- Unit tests: critical passes through with minimal/no cooldown, warning suppressed
  during active window, suppression counter increments correctly across multiple
  suppressed attempts, cooldown expiry allows next notification through with
  correct suppressed-count carried forward, cooldown state correctly shared/visible
  across simulated multiple instances (Redis-backed test)

## Explicitly out of scope here

- Router / actual channel delivery
- Batching's grouping-by-channel logic (already done upstream)
- Any content-aware override of cooldown (explicitly excluded per current decision)
