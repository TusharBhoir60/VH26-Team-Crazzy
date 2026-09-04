# Batching Stage — Implementation Brief for Antigravity

## Context

```
Safety Gate → Batching → Adaptive Cooldown → Router → PagerDuty / Slack / Email-Discord
```

Batching receives safety-validated incidents (deterministic severity, optional AI
enrichment attached) from Safety Gate. Its job: reduce notification volume further
by grouping non-urgent incidents into periodic digest sends, while making sure
nothing critical ever waits behind a batch window.

## Critical bypass — the headline rule

- **Any incident with `severity === 'critical'` skips batching entirely.** It is
  forwarded immediately to Adaptive Cooldown, not added to any batch queue, not
  subject to the 60s window.
- This must be the very first check in this stage — implement it as an early
  return, not a special case buried inside batching logic, so it's obviously
  correct on inspection and can't be accidentally bypassed by a refactor later.
- This is a direct extension of "zero missed critical alerts" — batching is
  explicitly a noise-reduction feature for `warning`/`info`, never for `critical`.

## Batching: fixed 60s window

- All non-critical incidents (`warning`, `info`) arriving within a rolling 60s
  window get added to an in-flight batch.
- At the end of each window, flush: send the accumulated batch onward to Adaptive
  Cooldown as a single batched unit, then start a new window.
- Make the window duration a named config constant (`BATCH_WINDOW_MS`), not a
  magic number — this is exactly the kind of value the team will tune after seeing
  real traffic volume.
- Use a simple timer-based flush (`setInterval` or a scheduled Redis-backed job if
  batching needs to survive process restarts — recommend confirming whether this
  service is expected to be single-instance or horizontally scaled, since a naive
  in-memory timer breaks the "one batch per window" guarantee across multiple
  instances; if scaling matters, batching state needs to live in Redis with a
  distributed lock or a single designated flusher, not in-process memory).

## Grouping: severity + destination channel

Within a batch, incidents are grouped by `(severity, destinationChannel)` pairs —
since Router downstream sends different severities to different channels
(PagerDuty/Slack/Email-Discord per the architecture diagram), grouping this way
means each notification that eventually goes out only contains incidents relevant
to that channel's audience.

- This means Batching needs to know the destination channel *before* Router
  actually routes — i.e. the severity→channel mapping (critical→PagerDuty,
  medium→Slack, low→Email/Discord per the diagram) needs to be available to this
  stage too, not just Router. Recommend: pull this mapping into a small shared
  config (`src/shared/channelMapping.ts`) that both Batching and Router import,
  rather than duplicating the severity→channel logic in two places.
- Output of a flush is not one incident, but a `BatchedGroup[]` — one entry per
  `(severity, channel)` pair that had at least one incident in the window, each
  containing the list of incidents in that group. Empty groups are simply omitted,
  not sent as empty batches.

## Data model

```
BatchedGroup: {
  severity: Severity,
  destinationChannel: string,
  incidents: Incident[],
  windowStart: timestamp,
  windowEnd: timestamp,
}
```

If scaling to multiple instances (per the note above), the in-flight batch state
per window needs a Redis structure like `batch:{severity}:{channel}` accumulating
incident references, flushed and cleared by whichever process owns that window's
flush.

## Zero missed critical alerts

- Already covered by the bypass rule — critical never enters this stage's queueing
  logic at all.
- Edge case: an incident that *arrives* as non-critical but whose severity later
  gets escalated (e.g. by a hypothetical future time-based escalation, or manually)
  while sitting in a batch window — out of scope for the current system since
  Severity is fixed at first-occurrence per earlier decisions, but worth a comment
  in code noting this assumption, since if that decision ever changes, Batching
  would need a way to promote an in-flight batched incident to bypass mid-window.

## Deliverables for this task

- `src/batching/index.ts` — `submitToBatch(incident: Incident): void` entry point
  (fire-and-forget for non-critical; for critical, this function should itself just
  immediately forward, not even queue)
- `src/batching/scheduler.ts` — the fixed-window flush timer/job
- `src/batching/config.ts` — `BATCH_WINDOW_MS` and any channel-mapping import
- `src/shared/channelMapping.ts` — severity → destination channel, shared with
  Router
- `src/batching/types.ts` — `BatchedGroup`
- `src/batching/store.ts` — in-memory or Redis-backed accumulation, depending on
  the single-instance-vs-scaled decision (default to in-memory for this pass unless
  you tell me multi-instance is a near-term requirement, in which case flag that
  and I'll revise this brief)
- Unit tests: critical bypass (never queued, immediate forward), non-critical
  batched and flushed after window, correct grouping by severity+channel, empty
  window produces no output, multiple incidents same group accumulate correctly

## Explicitly out of scope here

- Cooldown/rate-limiting logic (Adaptive Cooldown stage)
- Actual channel delivery (Router + integrations)
- The severity→channel mapping's own tuning (just needs to exist and be shared)
