# Correlation Stage — Implementation Brief for Antigravity

## Context

Stage 5 of the 7-stage alert proxy pipeline:

```
Ingest → Dedup → Lifecycle → Severity → Correlation → Batching → Cooldown → Routing
```

Correlation receives individually-severity-scored alerts and groups the ones that
are almost certainly symptoms of the same underlying incident — e.g. a database
outage that triggers alerts on the DB itself, every service that depends on it, and
every service that depends on *those*. Without correlation, one root failure can
produce dozens of separate notifications; this stage is what collapses that into
one coherent incident.

This is the most architecturally significant stage so far, since it's the first one
that needs external knowledge (the topology graph) rather than just the alert
payload itself — plan for that as a first-class dependency, not an afterthought.

## Core dependency: service topology graph

Correlation needs an explicit graph of service dependencies: `serviceA depends_on
serviceB`. This is **not derived from alert traffic** — it must be provided as
configuration/data, since inferring dependencies from co-occurring alerts is a much
harder (and much less reliable) problem than this stage should try to solve.

- Model as a directed graph: nodes = services, edges = "depends on" relationships.
- Source of truth for this task: a static config file (`src/correlation/topology/
  serviceGraph.ts` or a YAML/JSON file loaded at startup) — this is almost
  certainly wrong to hardcode long-term (real topology changes, ideally comes from
  a service catalog / CMDB), but for this pass, a maintained static file is the
  right scope. Design the loader so swapping in a real topology source later
  (service catalog API, etc.) doesn't require changing the correlation logic
  itself — isolate graph *loading* from graph *traversal*.
- Each alert needs to resolve to a node in this graph via its service tag (same tag
  Severity's criticality lookup uses — consider whether these two config sources
  should actually be the same service-registry file rather than two separately
  maintained lists).

## Correlation logic

1. When an alert arrives, look up its service in the topology graph.
2. Within a correlation time window (config constant, e.g. 5 min — alerts arriving
   further apart than this are treated as unrelated even if topologically
   connected), check for other currently-active alerts whose services are directly
   or transitively connected to this one (upstream or downstream in the graph, up
   to a configurable max hop distance — unbounded transitive correlation risks
   grouping unrelated things across a large service mesh).
3. If related active alerts are found, merge into (or add to) an existing incident
   group. If not, this alert may become the seed of a new incident group (which
   later alerts can join).
4. **Root cause selection**: among the alerts in a group, pick the most likely root
   cause using topology position as the primary signal — the alert on the
   *most upstream* node (the one furthest back in the dependency chain, with the
   most things depending on it) is the default root-cause candidate, since that
   matches the real-world pattern (DB fails → everything downstream lights up).
   Break ties (multiple alerts at the same topological depth) using severity, then
   earliest timestamp. Make this a named, testable function
   (`selectRootCause(group): Alert`), since this heuristic will likely need tuning.

## Output: merged incident object

- Correlated alerts are merged into a single `Incident` object (new type — define
  in `alert.types.ts` if not already present, or `src/correlation/types.ts` if the
  contract file is meant to stay stage-agnostic and this is correlation-specific).
- `Incident` should contain: the root-cause alert (full), the list of all
  contributing alerts (full, not just references — downstream stages need them for
  batching/reporting), overall severity (recommend: highest severity among the
  group, not just the root cause's — a root cause labeled `warning` with a
  `critical` downstream symptom should surface as `critical` overall), and a
  human-readable summary of the topology relationship (e.g. "database-primary →
  affects checkout-service, payments-service").
- An alert whose service isn't in the topology graph, or has no currently-active
  topologically-related alerts, still gets wrapped as a **single-alert incident**
  (not left in a different, un-typed shape) — this keeps Batching/Cooldown/Routing
  downstream working with one consistent `Incident` type regardless of whether
  correlation actually found anything to group.

## Zero missed critical alerts

- Merging must never cause a critical alert to be "hidden" inside a group where the
  overall incident severity ends up lower than that individual alert — hence
  "overall severity = highest in group," not root cause's severity, not an average.
- If the topology graph fails to load, or a service lookup errors, **fail open**:
  treat the alert as an unmatched single-alert incident rather than blocking it in
  the pipeline.
- Incident groups need a max size or max lifetime consideration — a graph error
  or unexpectedly dense topology could theoretically merge far too much into one
  incident; a sane upper bound (config constant) that logs a warning if hit is
  worth having, even if it's not expected to trigger under normal conditions.

## Deliverables for this task

- `src/correlation/index.ts` — `correlate(severedAlert): Promise<Incident>` entry
  point
- `src/correlation/topology/serviceGraph.ts` (or loader for external file) — graph
  data structure + load function, isolated from traversal logic
- `src/correlation/topology/traversal.ts` — upstream/downstream lookup, hop-distance
  limiting, pure functions over the graph structure for testability
- `src/correlation/rootCause.ts` — `selectRootCause(group): Alert`
- `src/correlation/incidentStore.ts` — Redis-backed active-incident tracking
  (correlation time window state, which alerts belong to which open incident)
- `src/correlation/types.ts` — `Incident` type (confirm/reconcile with
  `alert.types.ts`)
- Unit tests: single unrelated alert → single-alert incident, two topologically
  connected alerts within window → merged incident with correct root cause,
  alerts outside time window → not merged despite topology connection, missing
  topology entry → fail-open single-alert incident, overall severity takes the max
  not the root cause's severity, max-group-size guard

## Explicitly out of scope here

- Batching multiple incidents together for a single notification (Batching stage)
- Cooldown/rate-limiting on how often incident updates get sent (Cooldown stage)
- Actual notification formatting/delivery (Routing stage)
- Building/maintaining the real topology data source integration (service catalog,
  CMDB) — static config file is the scope for this pass
