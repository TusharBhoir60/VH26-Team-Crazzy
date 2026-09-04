# Normalization Module — Implementation Brief for Antigravity

## Context

This is a standalone module, called by Ingest but not part of it — Ingest handles
HTTP/auth/transport, Normalization handles turning source-specific payloads into the
one internal alert shape defined by `alert.types.ts`. Pulling it out means it can be
unit-tested in isolation, and new sources can be added without touching Ingest's
routing/auth code at all.

```
Ingest (HTTP, auth, raw payload) → Normalization (this module) → Dedup → ...
```

This module is being built **extensibly** — Alertmanager and Datadog are the first
two sources, but Grafana, CloudWatch, and others are expected later. The design
should make adding a new source a matter of writing one new adapter file, not
touching shared logic.

## Design: adapter/plugin pattern

- Define a `SourceAdapter` interface: something like
  `{ sourceName: string, normalize(rawPayload: unknown): NormalizationResult[] }`
- Each source gets its own adapter file implementing this interface:
  `adapters/alertmanager.ts`, `adapters/datadog.ts`.
- A central `registry.ts` maps source name → adapter, so Ingest calls something like
  `normalize(sourceName, rawPayload)` without knowing adapter internals.
- Adding Grafana later should mean: write `adapters/grafana.ts`, register it — no
  changes to Ingest, Dedup, or the registry's calling convention.

## Field mapping: best-effort, never hard-fail

This is the key behavioral decision for this module:

- Every adapter attempts to map as many fields as it can into `NormalizedAlert`.
- Fields that can't be cleanly mapped (unrecognized severity value, missing
  timestamp, unexpected label shape) are **not** a fatal error. Instead:
  - Apply a sane fallback (e.g. unmapped severity → `null` with warning,
    not silently dropped and not silently defaulted to something misleading like
    `info`).
  - Record what was flagged in a `normalizationWarnings: string[]` field on the
    output.
- **Never throw and drop the alert** because of an unmapped field. The only case
  Normalization should hard-reject a payload is if it's fundamentally unparseable
  (e.g. not valid JSON, missing the fields needed to construct *any* alert
  identity — no fingerprint-equivalent, no severity, no source at all). That case
  goes back to Ingest's dead-letter path, not silent loss.

This mirrors the "zero missed critical alerts" principle from Ingest: an alert with
a weird field beats no alert at all.

## Severity mapping tables

Same requirement as before — these need to be explicit, reviewed, named constants
per adapter, not inline conditionals:

```
adapters/alertmanager.ts → ALERTMANAGER_SEVERITY_MAP
adapters/datadog.ts      → DATADOG_SEVERITY_MAP
```

Any value not present in the map falls through to the best-effort `null` +
warning behavior above, not a guessed default.

## Fingerprint/identity derivation

- Alertmanager provides a native fingerprint — pass it through (or compute if missing).
- Datadog does not — derive one deterministically (e.g. stable hash of alert title +
  scope/tags) inside `adapters/datadog.ts`.
- Every adapter must guarantee it always produces *some* stable identity field, since
  Dedup depends entirely on this being consistent across repeated deliveries of the
  "same" alert.

## Deliverables for this task

- `src/normalization/types.ts` — `SourceAdapter` interface, `NormalizationResult`
  (wraps `Alert` + `warnings`)
- `src/normalization/registry.ts` — source name → adapter lookup + the public
  `normalize(sourceName, rawPayload)` entry point Ingest calls
- `src/normalization/adapters/alertmanager.ts`
- `src/normalization/adapters/datadog.ts`
- `src/normalization/severityMaps.ts` — the named severity constants above
- Unit tests per adapter: clean payload, payload with one unmapped field (warning
  path, not failure), payload missing everything (hard-reject path), Datadog
  fingerprint derivation stability (same logical alert → same fingerprint across
  multiple calls)

## Explicitly out of scope here

- HTTP handling, auth, request parsing (Ingest)
- Redis, dedup logic, TTLs (Dedup)
- Adding Grafana/CloudWatch adapters themselves — just make sure the pattern
  supports adding them later without rework
