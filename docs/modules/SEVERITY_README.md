# Severity Stage — Implementation Brief for Antigravity

## Context

Stage 4 of the 7-stage alert proxy pipeline:

```
Ingest → Dedup → Lifecycle → Severity → Correlation → Batching → Cooldown → Routing
```

Severity receives alerts that Lifecycle has classified as first-occurrence events
(new Firing, or a Flapping/Stale summary). Its job is to compute a **final,
authoritative severity** for the alert — the source's own severity label is an
input, not the answer, because a source-labeled "warning" hitting a tier-1 service
for the tenth time this week is a very different thing than the same label on a
low-traffic internal tool firing for the first time.

Output stays **categorical** (`critical` | `warning` | `info`) — not a numeric
score. This keeps downstream Routing logic simple (route by category, not by
threshold tuning on a float) at the cost of some resolution; that's an accepted
tradeoff for now.

**Severity is computed once, at first occurrence, and does not auto-escalate over
time.** An alert that's been firing for an hour keeps whatever severity it was
assigned at the start — time-based escalation is explicitly not this stage's job
(if the team wants that later, it'd be a deliberate addition, not implied by this
brief).

## Inputs to the score

1. **Source severity** — already normalized to the internal enum by the
   Normalization module (including its `unknown` fallback for unmapped values).
2. **Service-criticality tags** — alerts carry tags/labels identifying which
   service they're about (from Alertmanager labels or Datadog tags, already passed
   through by Normalization). This stage needs a **service criticality lookup**:
   a config/table mapping service name (or tag pattern) → criticality tier
   (e.g. `tier-1`, `tier-2`, `tier-3`). This table is operational data the team will
   maintain — put it in `src/severity/config/serviceCriticality.ts` as an editable,
   named export, not hardcoded inline.
3. **Historical alert frequency for that fingerprint** — how often has this exact
   alert fired historically (last N days/occurrences)? Needs a Redis-backed counter
   or small time-series (separate from Dedup's short-TTL suppression counter — this
   one needs to persist across dedup windows to be useful, e.g. `history:{fingerprint}`
   with a longer-lived rolling count). A fingerprint firing constantly may indicate
   either a known-flaky low-priority thing (down-weight) or a persistent unresolved
   problem worth escalating (up-weight) — this needs an explicit policy decision,
   not left ambiguous in code (see Scoring Policy below).

## Scoring policy: combine inputs into one category

Recommend a deterministic rule table rather than a black-box weighted formula,
since categorical output means you don't need continuous math — you need clear
if/else precedence that's easy to reason about and to override during incident
review. Something like:

1. Start with source severity as the baseline.
2. If service-criticality tier is `tier-1` and source severity is `warning`,
   **upgrade** to `critical`.
3. If historical frequency for this fingerprint exceeds a "known noisy" threshold
   (config constant, e.g. fired >20 times in the last 7 days) and source severity
   is `warning` or `info`, **no upgrade** — flag it as a candidate for the team to
   review/mute at the source, but don't silently downgrade either (downgrading a
   real signal because it's frequent is exactly the kind of thing that causes missed
   incidents).
4. `critical` from the source is never downgraded by any of the above — criticality
   tags and frequency can only push things *up* in this scoring pass, never below
   what the source itself asserted. This directly protects "zero missed critical
   alerts."

Make each rule a named, testable function (`applyServiceCriticalityRule`,
`applyFrequencyRule`, etc.) run in a fixed, documented order, rather than one
monolithic scoring function — this makes it much easier to add a fifth input later
without rewriting everything.

## Zero missed critical alerts

- Rule 4 above is the hard guarantee: nothing in this stage can lower a
  source-asserted `critical` down to `warning` or `info`.
- If the service-criticality lookup fails to find a match for a given
  service/tag (unrecognized service), default to treating it as **unknown-but-not
  -deprioritized** — don't assume `tier-3`/low-priority by default just because it's
  not in the table. Log it so the criticality table can be updated.
- Same fail-open principle: if the Redis-backed frequency lookup is unavailable,
  proceed using just source severity + criticality tags rather than blocking the
  alert.

## Deliverables for this task

- `src/severity/index.ts` — `scoreSeverity(alert, lifecycleContext):
  Promise<SeverityResult>` entry point
- `src/severity/config/serviceCriticality.ts` — service/tag → tier lookup table
- `src/severity/config/thresholds.ts` — the "known noisy" frequency threshold and
  any other tunable constants, named and exported
- `src/severity/rules/` — one file per rule (`serviceCriticalityRule.ts`,
  `frequencyRule.ts`), each a pure function `(currentSeverity, context) →
  newSeverity`, applied in a fixed pipeline in `index.ts`
- `src/severity/historyStore.ts` — Redis-backed fingerprint frequency tracking,
  separate namespace from Dedup's short-TTL counter
- `src/severity/types.ts` — `SeverityResult` (final category + which rules fired,
  for debuggability/audit trail)
- Unit tests: baseline pass-through, tier-1 warning upgrade, noisy-fingerprint
  flagged-not-downgraded, critical never downgraded regardless of other inputs,
  unrecognized service defaults safely, Redis-unavailable fallback

## Explicitly out of scope here

- Time-based auto-escalation (explicitly excluded per current decision)
- Cross-alert correlation (Correlation stage)
- Routing decisions based on the final severity (Routing stage)
- Numeric/weighted scoring (deferred — categorical only for now)
