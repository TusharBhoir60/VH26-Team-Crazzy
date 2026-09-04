# Pipeline Integration Verification — Prompt for Antigravity

## Purpose

Ten module briefs have been implemented for the alert proxy pipeline. This is not
a request to build a new module — it's a request to **verify the existing modules
actually connect correctly end-to-end**, catch contract mismatches between
adjacent stages, and flag any place where one module's assumptions don't match
what the module before or after it actually produces/expects.

## Full pipeline being verified

```
Prometheus/Datadog → Ingest → Normalize → Dedup → Lifecycle Tracker →
Severity Scorer → Correlation Engine → [Safety Gate ← AI Layer] →
Batching → Adaptive Cooldown → Router → PagerDuty/Slack/Email-Discord
```

## Verification checklist

Go through each handoff point below and confirm the two sides actually agree —
don't just check that each module works in isolation, check the **interface
between them**.

### 1. Type contract consistency (`alert.types.ts` and friends)
- Does every module import and use the same `NormalizedAlert`, `Incident`,
  `SeverityResult`, `DedupResult`, `LifecycleResult`, `CooldownResult`,
  `AiEnrichmentResult`, `ChannelAdapter` types from a single shared source, or has
  drift crept in where two modules independently redefine an overlapping shape?
- Flag any field referenced by a downstream module (e.g. Router expecting
  `aiEnrichment.narrative`) that isn't actually guaranteed to exist by the upstream
  module producing it (e.g. Safety Gate might set `aiEnrichment: null`).

### 2. Ingest → Normalization
- Ingest's brief was written *before* Normalization was split out into its own
  module — confirm Ingest's actual code calls the standalone
  `normalize(sourceName, rawPayload)` entry point rather than containing its own
  inline parsing logic (an earlier draft described parsers living inside
  `src/ingest/parsers/`, which is now stale). Flag and fix if the old structure
  is still present.
- Confirm Ingest passes `sourceName` derived from the route
  (`/webhooks/alertmanager` vs `/webhooks/datadog`) in the exact format
  Normalization's registry expects as a lookup key.

### 3. Normalization → Dedup
- Confirm every adapter (Alertmanager, Datadog) guarantees a non-empty, stable
  fingerprint field on every `NormalizedAlert` it produces — Dedup's entire
  suppression logic depends on this being present and consistent across repeated
  deliveries of the same logical alert.
- Confirm `normalizationWarnings` (best-effort mapping flags) don't accidentally
  block or alter Dedup's fingerprint-matching logic.

### 4. Dedup → Lifecycle
- Confirm the Redis key namespace/shape actually matches — the Lifecycle brief
  recommended *extending* Dedup's `dedup:{fingerprint}` hash rather than owning a
  separate key. Verify which approach was actually implemented, and if it's a
  separate key, confirm both keys are kept in sync (same TTL semantics or an
  explicit rationale for why they diverge).
- Confirm Dedup only forwards first-occurrence (non-duplicate) alerts to
  Lifecycle, and that duplicate counts tracked in Dedup are actually accessible to
  whatever later stage is meant to report "fired N times."

### 5. Lifecycle → Severity
- Confirm Severity's frequency-history lookup (`history:{fingerprint}`) is a
  genuinely separate, longer-lived Redis structure from both Dedup's short-TTL
  counter and Lifecycle's flap-window transitions — verify there isn't accidental
  reuse or clobbering across these three different Redis concerns for the same
  fingerprint.
- Confirm a Flapping-state consolidated summary from Lifecycle still carries
  enough original alert data for Severity to score it (source severity, tags)
  rather than only summary metadata.

### 6. Severity → Correlation
- Confirm Correlation's service-lookup (for topology matching) and Severity's
  service-criticality lookup are either the same shared config source, or if
  they're separate, confirm service names/tags are referenced identically in both
  (a mismatch here — e.g. `payments-service` vs `payments_service` — would silently
  break both).
- Confirm Correlation never treats the severity it receives as a suggestion — the
  Severity stage's "critical never downgraded" invariant must survive unchanged
  through Correlation's own "overall severity = max of group" logic.

### 7. Correlation → Safety Gate → AI Layer
- Confirm Safety Gate actually receives the full `Incident` object (root cause +
  all contributing alerts), not a stripped-down version — the AI Layer's prompt
  needs this context to produce a meaningful root-cause suggestion/narrative.
- Confirm the 2-second timeout is enforced at the AI Layer call itself and that a
  timeout genuinely returns `null` rather than throwing an unhandled rejection that
  could crash or block Safety Gate.
- Confirm the reject/flag violation path (quarantine) is wired to something that
  actually persists — verify `safety-gate:quarantine` is reachable/inspectable and
  isn't just written and forgotten with no monitoring hook.
- Confirm a quarantined incident genuinely does **not** reach Batching — trace the
  actual control flow to be sure there isn't a code path where quarantine is
  logged but the incident still gets forwarded anyway.

### 8. Safety Gate → Batching
- Confirm Batching's severity→channel mapping (`src/shared/channelMapping.ts`) is
  actually the single shared source Router also uses — not two independently
  maintained copies.
- **Known open inconsistency to resolve**: Batching's brief defaulted to
  in-memory state, but Safety Gate/Cooldown/Router were all confirmed to be
  Redis-backed for horizontal scaling. Verify Batching's actual implementation —
  if it's still in-memory, this needs to be flagged as a real bug risk (batch
  windows will behave incorrectly under multiple instances) and reconciled to
  match the rest of the pipeline.
- Confirm the critical-bypass path in Batching genuinely skips the batch queue
  entirely rather than being added with a zero-length window (subtle but
  meaningfully different — verify by tracing code, not just reading the function
  name).

### 9. Batching → Cooldown
- Confirm Cooldown's `applyCooldown` correctly handles both shapes it can
  receive — a single bypassed-critical incident, and a `BatchedGroup` — and that
  fingerprint-keying for cooldown purposes makes sense for a batched group (is
  cooldown keyed per-incident-within-the-group, or per-group? Verify this was
  actually decided and implemented consistently, since it wasn't explicitly
  specified in either brief).

### 10. Cooldown → Router
- Confirm Router's `formatNotification` correctly renders both a single incident
  and a suppressed-count-augmented notification (i.e. "3 additional occurrences
  suppressed during cooldown" actually shows up when relevant, not just for the
  first notification of a fingerprint).
- Confirm real channel adapters are reading credentials from env vars that
  actually exist in `.env`/deployment config, and that a missing credential fails
  loudly at startup rather than silently at first send.
- Confirm the dead-letter path for exhausted retries and Safety Gate's quarantine
  path are consistent in structure (both are "something needs human review" data)
  even though they're separate stores — flag if it'd be worth unifying them into
  one `pipeline:review` namespace for easier ops visibility, or if keeping them
  separate is intentional.

## Cross-cutting checks (apply to the whole pipeline, not one handoff)

- **Zero missed critical alerts**: trace a critical alert through every single
  stage end-to-end and confirm there is no code path — including error/exception
  paths — where a critical-severity alert can be silently dropped rather than
  either delivered or explicitly dead-lettered/quarantined with visibility.
- **Fail-open consistency**: every stage that touches Redis was designed to
  fail open (proceed without blocking) on Redis unavailability. Verify this is
  actually implemented uniformly — a single stage that fails closed would create
  a silent bottleneck under a Redis outage.
- **Fingerprint identity**: trace one alert's fingerprint from Normalization
  through to Router and confirm it's never accidentally regenerated, reformatted,
  or lost at any handoff — every stage's Redis keys and grouping logic depend on
  this staying stable.
- **Config sprawl**: list every named config constant across all ten modules
  (TTLs, thresholds, windows, timeouts) and confirm none of them silently
  duplicate or contradict each other (e.g. two different modules independently
  defining a "5 minute" constant under different names — should probably be one
  shared constant).

## Deliverable

A short written report (not a code change, unless a genuine bug is found) listing:
1. Confirmed-consistent handoffs (brief note, no action needed)
2. Contract mismatches found, with the specific files/fields involved
3. The known Batching in-memory-vs-Redis inconsistency — resolved or still open
4. Any other drift discovered between what a brief specified and what was
   actually implemented
5. Recommended fixes, prioritized by which ones risk the zero-missed-critical
   guarantee vs which are lower-stakes cleanup
