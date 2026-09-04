# Lifecycle Stage — Implementation Brief for Antigravity

## Context

Stage 3 of the 7-stage alert proxy pipeline:

```
Ingest → Dedup → Lifecycle → Severity → Correlation → Batching → Cooldown → Routing
```

Lifecycle receives first-occurrence alerts from Dedup (duplicates never reach here —
Dedup already suppressed those and is tracking counts). Lifecycle's job is to track
each alert's *state* over time and detect flapping — an alert oscillating between
firing and resolved repeatedly, which is exactly the kind of noise that burns out
on-call engineers even when each individual notification looks legitimate.

## State model: 4 states

```
Firing → Flapping → Stale → Resolved
   ↑________________|
   (a Flapping alert can return to Firing if it settles down)
```

- **Firing** — alert is active, has not exceeded the flap-transition threshold.
  Default state on first occurrence from Dedup.
- **Flapping** — alert has crossed the flap-transition threshold within the fixed
  window (see below). Individual notifications are suppressed; a consolidated
  summary is sent instead (see Flapping Behavior).
- **Stale** — alert has been firing (or flapping) with no updates for longer than a
  configured staleness timeout, and no explicit "resolved" was ever received from
  the source. This is different from Resolved: it means the proxy doesn't actually
  know what happened (source may have crashed, network dropped the resolve webhook,
  etc.) — treat this as "probably resolved, but flag the uncertainty," not the same
  confidence as an explicit resolve.
- **Resolved** — source explicitly sent a resolved/OK state for this fingerprint.

State transitions and their timestamps must be recorded (not just the current
state) — Batching/Routing downstream may want the history (e.g. "flapped 6 times
over 23 minutes before resolving") for the eventual notification summary.

## Redis data model

Extends the `dedup:{fingerprint}` hash Dedup already created (same key namespace —
confirm with Dedup's implementation whether Lifecycle reads/writes the same key or
uses a separate `lifecycle:{fingerprint}` key; recommend **same key**, since it's
the same logical alert entity, to avoid two sources of truth for one fingerprint).

Add fields:
```
state: 'firing' | 'flapping' | 'stale' | 'resolved'
transitions: [{ state, at: timestamp }, ...]   // or a capped ring buffer, not unbounded
lastTransitionAt: timestamp
```

TTL note: Lifecycle's Redis presence needs a longer life than Dedup's short dedup
TTL, since flap-window tracking (10 min default) and staleness detection need the
record to survive past Dedup's own suppression TTL. Recommend a separate, longer
TTL for the lifecycle portion of the record, refreshed on every transition, with
final cleanup on reaching `Resolved` (short grace-period TTL after resolve, then
delete).

## Flapping detection: N transitions in a fixed window

- Default: **4 firing↔resolved transitions within a 10-minute fixed window**
  classifies the alert as Flapping. Make both numbers named config constants
  (`FLAP_TRANSITION_THRESHOLD`, `FLAP_WINDOW_MS`) — these are exactly the kind of
  values the team will tune after seeing real traffic.
- "Fixed window" here means: look at the transition timestamps in the alert's
  history, count how many fall within the most recent `FLAP_WINDOW_MS`, compare to
  threshold. This is a rolling check evaluated on every new transition, not a
  window that starts once and never resets.
- Once flapping is triggered, the alert stays in `Flapping` state until transitions
  quiet down — recommend: if no new transition occurs for `FLAP_WINDOW_MS` after the
  last one, allow it to fall back to `Firing` (if currently active) so it can
  resume normal single-alert handling once it's stopped oscillating.

## Flapping behavior: suppress + consolidated summary

- While in `Flapping` state, individual firing/resolved transitions are **not**
  forwarded downstream as separate events.
- Instead, emit a single consolidated "flapping summary" event when the alert either
  (a) exits Flapping state (settles back to Firing or Resolved), or (b) has been
  flapping continuously past some maximum duration worth proactively reporting
  (recommend a config value, e.g. report every 15 min if still flapping, so a
  long-running flap doesn't go completely silent).
- The summary event should carry the transition count and time range (e.g. "flapped
  9 times between 14:02–14:14") so Routing/notification can present something
  useful instead of "alert flapping" with no context.

## Zero missed critical alerts

- Flapping suppression must **never apply blindly to critical severity** without a
  ceiling — recommend: even a critical alert that's flapping still gets suppressed
  per the above, since the point is these are usually not new information, but the
  consolidated summary must fire promptly (short max-duration-before-forced-summary
  for critical, e.g. 2 min, vs the longer default for lower severities).
- Same fail-open principle as Dedup: if Redis is unavailable and Lifecycle can't
  determine state, default to `Firing` and forward the alert rather than blocking
  or dropping it.

## Deliverables for this task

- `src/lifecycle/index.ts` — `trackLifecycle(alert: NormalizedAlert):
  Promise<LifecycleResult>` entry point, called from Dedup's non-duplicate path
- `src/lifecycle/config.ts` — `FLAP_TRANSITION_THRESHOLD`, `FLAP_WINDOW_MS`,
  staleness timeout, per-severity max-flapping-duration-before-summary
- `src/lifecycle/stateMachine.ts` — the Firing/Flapping/Stale/Resolved transition
  logic, pure function where possible (state + event → new state) for easy testing
- `src/lifecycle/types.ts` — `LifecycleResult`, `LifecycleState` enum, transition
  history shape
- Unit tests: normal firing→resolved (no flap), flap threshold crossed, flap
  settling back to firing, stale timeout with no resolve, Redis-unavailable
  fail-open path, critical-severity forced summary timing

## Explicitly out of scope here

- Dedup's exact-repeat suppression (already done upstream)
- Severity assignment/re-scoring (Severity stage)
- Cross-alert correlation (Correlation stage)
- Actual notification delivery (Routing stage) — Lifecycle only emits internal
  events/summaries for later stages to act on
