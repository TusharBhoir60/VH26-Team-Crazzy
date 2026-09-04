# Architecture Document — Alert Fatigue Buster

## 1. High-Level System Diagram

```
[Prometheus Alertmanager Webhook] ─┐
[Datadog Webhook]                  ├──> [INGEST SERVICE] (Express, single :8080 endpoint per source)
                                    │         │
                                    │         ▼
                                    │    normalize → internal Alert schema
                                    │         │
                                    │         ▼
                                    │    [DEDUP] ── fingerprint hash (alertname+labels) → Redis SETNX + TTL
                                    │         │  (duplicate? increment counter, suppress, return)
                                    │         ▼
                                    │    [LIFECYCLE TRACKER] ── state machine per fingerprint in Redis
                                    │         │  firing / re-firing(flapping) / resolved
                                    │         ▼
                                    │    [SEVERITY SCORER] ── rule-based (labels/priority)
                                    │         │              → LLM fallback (Groq) if no label present [STRETCH]
                                    │         ▼
                                    │    [CORRELATION ENGINE] ── load service-dependency-graph.yaml
                                    │         │  walk graph from alert's service node upward
                                    │         │  find earliest-firing upstream node in active window = root cause
                                    │         │  tag alert with cluster_id + root_cause_ref
                                    │         ▼
                                    │    [BATCHING] ── sliding window buffer per cluster_id (e.g. 10s)
                                    │         │  flush on window close or crit-alert-triggers-immediate-flush
                                    │         ▼
                                    │    [ADAPTIVE COOLDOWN] ── check Redis: last_notified_at[fingerprint/cluster_id]
                                    │         │  if within cooldown window (severity-scaled) → suppress, else proceed
                                    │         ▼
                                    │    [AI NARRATIVE] [STRETCH] ── Groq API call with cluster context
                                    │         │  → 2-sentence root-cause summary
                                    │         ▼
                                    │    [ROUTER] ── severity → channel map
                                    │         │
                    ┌───────────────┴───────────────┐
                    ▼               ▼                ▼
              [PagerDuty]        [Slack]          [Email/Discord]
               (Critical)        (Medium)             (Low)
```

## 2. Tech Stack Layers

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend | React + Vite | Instant dev server, live-updating dashboard, composable chart widgets |
| Backend runtime | Node.js 20 LTS + TypeScript + Express | Async I/O fit for webhook bursts; TS compile-time contracts across 4-person team |
| State/cache | Redis | Sub-ms TTL primitives for dedup, cooldown, batching windows |
| Persistent store | Supabase (Postgres) | Relational alert/cluster history; free hosted tier; built-in realtime for dashboard; judges access live URL with zero local setup |
| AI layer | Groq API | Fastest inference — narrative gen sits in live notify path, latency-sensitive |
| Deployment | Docker Compose | One-command reproducible spin-up; local Postgres fallback if Supabase unreachable during demo |

## 3. Folder Structure + Module Ownership

```
alert-fatigue-buster/
├── src/
│   ├── types/
│   │   └── alert.types.ts          # LOCKED DAY 1 — shared Alert interface. No edits post-lock without team sync.
│   ├── ingest/                     # Dev A
│   ├── dedup/                      # Dev A
│   ├── lifecycle/                  # Dev B
│   ├── severity/                   # Dev B
│   ├── correlation/                # Dev C
│   ├── batching/                   # Dev C
│   ├── cooldown/                   # Dev D
│   ├── routing/                    # Dev D
│   ├── narrative/                  # Stretch — whoever's free
│   ├── dashboard-api/              # Owned by whichever dev's data it exposes
│   ├── shared/                     # redis.client.ts, logger.ts
│   ├── pipeline.ts                 # Orchestrator — touched last, one owner
│   └── server.ts
├── dashboard/                       # Separate npm workspace — React frontend
├── config/
│   └── service-dependency-graph.yaml
├── docs/
├── .env.example
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

**Merge-safety rules:**
1. `alert.types.ts` locked in first hour via team sync — defines `Alert` interface + `PipelineStage = (alert: Alert) => Promise<Alert>` signature
2. Each dev works only inside their own folder(s) — zero cross-folder edits eliminates merge conflicts
3. `pipeline.ts` touched last, by one person, after all branches merge
4. Branch naming 1:1 with folder ownership: `feature/dedup`, `feature/correlation`, etc.
5. Every stage exports a pure function matching `PipelineStage` type — independently testable, trivially composable

## 4. Failure Modes & Resilience

### Redis unavailable
- **Behavior: fail open, not fail closed.** If Redis is down, dedup/cooldown/lifecycle checks are skipped — alert passes through to routing unfiltered rather than being silently dropped.
- Rationale: this directly protects the PRD's non-negotiable constraint — 100% critical alert recall. A noisy alert getting through during a Redis outage is acceptable; a critical alert getting silently eaten is not.
- Implementation: wrap all Redis calls in try/catch; on error, log at `error` level and continue pipeline execution with default-pass-through values (e.g. `dedup check fails open = treat as not-duplicate`).

### Postgres/Supabase unavailable
- Does not block the live alert pipeline — Postgres is used for history/dashboard reads, not real-time routing decisions.
- Writes to Postgres are fire-and-forget with error logging; a failed history write does not fail the request or block notification delivery.
- Local Docker Postgres fallback documented in DEPLOYMENT.md for demo-day network risk.

### Webhook retry behavior
- Ingest endpoints must respond within 200ms to avoid monitoring-tool-side retry storms (Alertmanager/Datadog will retry on timeout, compounding load).
- Strategy: acknowledge receipt immediately (`200 OK`), process pipeline stages asynchronously after response is sent.

### Notification sender failure (Slack/PagerDuty/Discord/Email down or erroring)
- Each sender call wrapped independently in try/catch.
- One channel failing must not block others — Critical/PagerDuty failure must not prevent Slack/Email from still attempting delivery, and vice versa.
- Failed sends logged with alert fingerprint for manual follow-up; not silently swallowed.

### Flapping alerts
- Lifecycle tracker explicitly detects fire→resolve→fire loops within a short window and flags as `flapping` state — routed with lower urgency/longer cooldown rather than treated as a fresh critical event each cycle.

### Correlation engine — no dependency graph entry for a service
- If an alert's service isn't in `service-dependency-graph.yaml`, correlation is skipped for that alert — it routes as a standalone alert (no cluster_id) rather than blocking or erroring the pipeline.

## 5. Data Flow Summary

Alert enters via webhook → normalized to internal schema → deduplicated → lifecycle-tracked → severity-scored → correlated into a cluster (or standalone) → batched within its window → checked against adaptive cooldown → optionally enriched with AI narrative → routed to the correct channel(s) based on severity. Every stage that touches Redis fails open on error. Every stage is a pure, independently testable function chained by the orchestrator in `pipeline.ts`.
