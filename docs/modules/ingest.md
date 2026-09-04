# Ingest Stage — Implementation Brief for Antigravity

## Context

This is Stage 1 of a 7-stage alert proxy pipeline:

```
Ingest → Dedup → Lifecycle → Severity → Correlation → Batching → Cooldown → Routing
```

The alert proxy sits between monitoring tools (Prometheus Alertmanager, Datadog) and
notification channels (Slack, PagerDuty, etc.), collapsing noisy duplicate/flapping
alerts into a small number of high-signal notifications — cutting alert volume ≥50%
and dropping MTTR from 45+ min to <5 min, **without ever silencing a real critical
alert**.

`alert.types.ts` is the locked contract for this pipeline. Do not modify it as part
of this task — Ingest must produce output conforming to it, not redefine it.

## Scope of this task: Ingest only

Ingest is the entry point of the pipeline. Its job is narrow and disciplined:

1. **Receive** webhooks from two sources on separate endpoints:
   - `POST /webhooks/alertmanager` — Prometheus Alertmanager format
   - `POST /webhooks/datadog` — Datadog Webhooks format
2. **Authenticate** each request via HMAC signature validation against a per-source
   shared secret (see Auth section).
3. **Validate** the raw payload against a source-specific schema. Reject malformed
   payloads with a clear 4xx and structured error — never let a bad payload
   propagate downstream.
4. **Normalize** the source-specific payload into the single common internal format
   defined by `alert.types.ts` (`NormalizedAlert` or equivalent — confirm exact type
   name from the contract file).
5. **Hand off** the normalized alert to the next stage (Dedup) — via direct function
   call, internal event emitter, or queue push, per whatever handoff mechanism the
   architecture doc specifies. If nothing is specified yet, default to an in-process
   call to a `handleNormalizedAlert()` entry point stub for Dedup, so the two stages
   can be wired independently.
6. **Never drop silently.** Anything that fails validation, auth, or normalization
   must be logged with enough context to debug, and (for critical-severity-looking
   alerts) must not simply vanish — see Zero Missed Critical Alerts below.

Ingest does **not** dedup, correlate, batch, or make routing decisions. Resist the
urge to add any of that logic here — it belongs to later stages.

## Runtime

- **Framework:** Express (TypeScript)
- **Package manager / structure:** follow whatever `package.json` / `tsconfig.json`
  Antigravity has already scaffolded at the repo root; add to it, don't replace it.

## Auth: HMAC signature validation

- Each source (Alertmanager, Datadog) has its own shared secret, loaded from env
  vars (e.g. `ALERTMANAGER_WEBHOOK_SECRET`, `DATADOG_WEBHOOK_SECRET`).
- Compute HMAC-SHA256 over the raw request body using the relevant secret, compare
  against the signature header the source sends (confirm exact header name/format
  per source — Alertmanager and Datadog differ here and this needs a quick check
  against their docs before hardcoding).
- Use a constant-time comparison (`crypto.timingSafeEqual` or equivalent) — do not
  use `===` on the computed vs provided signature.
- Requests that fail signature validation get `401` and are logged (source, IP,
  timestamp) but the raw body is not logged (may contain sensitive alert data).
- Middleware must read the **raw body** before any JSON body-parser mutates it —
  Express's default `express.json()` needs to be configured to expose `req.rawBody`
  or use `express.raw()` for the webhook routes specifically.

## Two formats → one internal format

- Build two parser/normalizer modules: `parsers/alertmanager.ts` and
  `parsers/datadog.ts`, each exporting a `normalize(rawPayload) → NormalizedAlert`
  function.
- Both must map into the *same* fields defined in `alert.types.ts` — severity,
  fingerprint/dedup key, source, timestamps (starts_at/ends_at or equivalent),
  labels/tags, description/summary, and a `raw` passthrough field for debugging.
- Severity mapping needs explicit, reviewed tables (Alertmanager's `severity` label
  values vs Datadog's alert_type/priority values) — don't guess-map these silently;
  flag any values that don't map cleanly to the internal severity enum instead of
  defaulting them to something arbitrary.
- Fingerprinting: Alertmanager already provides a `fingerprint`; Datadog does not —
  Ingest needs to derive a stable fingerprint from Datadog payloads (e.g. hash of
  alert title + scope/tags) so Dedup downstream has something consistent to work
  with across both sources.

## Zero missed critical alerts

This is a hard constraint on the whole system, and Ingest is the first place it can
be violated:

- If normalization fails for a payload that *looks* high-severity (best-effort check
  before full parsing), don't just 400-and-forget — write it to a dead-letter log/
  queue so nothing critical is lost to a parsing bug. This can be a simple file or
  Redis list stub for now; the DLQ mechanics can be hardened later.
- Health/liveness endpoint (`GET /healthz`) so this service's own downtime is
  detectable — an Ingest outage is itself an incident.

## Deliverables for this task

- `src/ingest/` — Express router + middleware for both webhook endpoints
- `src/ingest/parsers/alertmanager.ts`, `src/ingest/parsers/datadog.ts`
- `src/ingest/auth/hmac.ts` — shared HMAC verification middleware, parameterized by
  secret + header name so it works for both sources
- `src/ingest/deadletter.ts` — minimal DLQ stub
- Unit tests for both parsers using realistic sample payloads (include a fixtures
  folder: `src/ingest/__fixtures__/`)
- Update `/docs/` if the actual header names / severity mappings differ from what's
  assumed above once verified against source docs

## Explicitly out of scope here

- Redis wiring (state, cooldowns, timers) — that's Dedup/Lifecycle territory
- Routing/notification logic
- Correlation/batching logic
