# Pipeline Integration Verification Report

**Generated**: 2026-09-05  
**Test Suite Results**: 15 passed / 7 failed / 22 total suites (68 tests passing within passing suites)

---

## 1. Type Contract Consistency (`alert.types.ts`)

### ⚠️ SEVERITY TYPE MISMATCH — HIGH PRIORITY

The shared `Severity` type was updated to a 3-tier system during the Severity stage:

```ts
// Current (alert.types.ts)
export type Severity = 'critical' | 'warning' | 'info' | 'unknown';
```

However, **5 modules still reference the old 4-tier severity values** (`high`, `medium`, `low`) that no longer exist in the union:

| Module | File | Uses old values |
|--------|------|----------------|
| Dedup | `dedup/config.ts` | `high`, `medium`, `low` in `SEVERITY_TTL_MAP` |
| Correlation | `correlation/index.ts` | `high`, `medium`, `low` in `severityLevels` |
| Correlation | `correlation/rootCause.ts` | `high`, `medium`, `low` in `severityWeight` |
| Safety Gate | `safety-gate/__tests__/validateEnrichment.test.ts` | `high`, `medium` in `SEVERITY_RANK` |
| AI Layer | `ai-layer/index.ts` (Zod schema) | `z.enum(['critical', 'high', 'medium', 'low'])` |
| Lifecycle | `lifecycle/config.ts` | `high`, `medium`, `low` in `MAX_FLAP_DURATION_MS` |

**Impact**: TypeScript compilation fails for 7 of 22 test suites. Any module referencing `high`, `medium`, or `low` will produce a type error at compile time and incorrect behavior at runtime. The AI Layer's Zod validation schema will **reject valid `'warning'`/`'info'` suggestions** from Groq, silently treating them as malformed.

**Fix**: Update all references from `high → warning`, `medium → info`, `low → info` (or add them to the config as needed), and update the Zod schema in `ai-layer/index.ts` to `z.enum(['critical', 'warning', 'info', 'unknown'])`.

---

### ⚠️ DUPLICATE `BatchedGroup` TYPE — MEDIUM PRIORITY

Two independent definitions of `BatchedGroup` exist:

1. **`src/types/alert.types.ts`** (added by Router stage):
   ```ts
   export interface BatchedGroup {
     id: string;
     incidents: Alert[];
     severity: Severity;
     service?: string;
     cooldown_suppressed_count?: number;
     aiEnrichment?: { narrative?: string };
   }
   ```

2. **`src/batching/types.ts`** (added by Batching stage):
   ```ts
   export interface BatchedGroup {
     severity: Severity;
     destinationChannel: string;
     incidents: Incident[];      // ← uses Incident, not Alert
     windowStart: number;
     windowEnd: number;
   }
   ```

**Impact**: These two types are structurally incompatible — different `incidents` array types (`Alert[]` vs `Incident[]`), different fields. The Router imports `BatchedGroup` from `alert.types.ts` but Batching produces the one from `batching/types.ts`. Any downstream code that tries to consume Batching's output through Router will have a silent shape mismatch.

**Fix**: Unify into a single `BatchedGroup` in `alert.types.ts` that satisfies both consumers, or rename one to avoid ambiguity.

---

### ⚠️ DUPLICATE `Incident` TYPE — HIGH PRIORITY

Two independent definitions of `Incident` exist:

1. **`src/correlation/types.ts`**:
   ```ts
   export interface Incident {
     incident_id: string;
     root_cause: Alert;              // ← root_cause is a full Alert
     alerts: Alert[];
     severity: Severity;
     summary: string;
     created_at: string;
   }
   ```

2. **`src/safety-gate/types.ts`**:
   ```ts
   export interface Incident extends Cluster {
     alerts: Alert[];
     aiEnrichment: AiEnrichmentResult | null;
     safetyViolation: boolean;
     safetyViolationDetail?: SafetyViolationDetail;
   }
   ```

**Impact**: Safety Gate's `Incident` extends `Cluster` (which has `root_cause: { service, alert, confidence } | null`), while Correlation's `Incident` has `root_cause: Alert`. These are completely different shapes. The Cooldown module imports from `correlation/types`, but receives data from Safety Gate which uses a different `Incident` shape. The `applyCooldown` function accesses `incident.root_cause.fingerprint` — which **only exists on Correlation's Incident, not Safety Gate's**.

**Fix**: Establish a single canonical `Incident` interface in `alert.types.ts` that supports both the Correlation and Safety Gate flows.

---

## 2. Ingest → Normalization ✅ (Mostly Consistent)

- Ingest's controller calls `normalize('prometheus', req.body)` and `normalize('datadog', req.body)` from `../normalization` — correctly using the standalone normalization registry.
- **However**, parsers still live in `src/ingest/parsers/` (the old structure flagged in the verification doc). These are imported by the normalization adapters via relative paths, so the system works, but the organizational structure is stale — parsers should conceptually live under `src/normalization/adapters/`.
- Registry correctly aliases `'prometheus'` → AlertmanagerAdapter, `'datadog'` → DatadogAdapter.

---

## 3. Normalization → Dedup ✅ (Consistent)

- Both Alertmanager and Datadog adapters produce stable SHA-256 fingerprints via `shared/crypto.ts`.
- `normalizationWarnings` are metadata-only and do not affect the fingerprint or downstream dedup logic.

---

## 4. Dedup → Lifecycle ✅ (Consistent, separate Redis keys)

- Dedup uses `dedup:{fingerprint}` keys. Lifecycle uses `lifecycle:{fingerprint}` keys. These are separate namespaces — no accidental clobbering.
- Dedup correctly forwards only first-occurrence and resolved alerts to the Lifecycle handler. Duplicates are suppressed and counted.
- **Note**: Dedup's `count` field (tracking how many times an alert fired) is stored in the Redis hash but is **not propagated downstream** to any later stage that might want to report "fired N times." The DedupResult is returned but not attached to the Alert object forwarded to Lifecycle.

---

## 5. Lifecycle → Severity ✅ (Separate Redis concerns)

- Lifecycle uses `lifecycle:{fingerprint}` (1-hour TTL for active, 5-min for resolved).
- Severity uses `history:{fingerprint}` (7-day TTL for frequency tracking).
- Dedup uses `dedup:{fingerprint}` (severity-scaled short TTL: 60s–1800s).
- All three are genuinely separate Redis key namespaces — no accidental reuse.
- Lifecycle returns a `LifecycleResult extends Alert`, which carries the full Alert data plus `lifecycle_state` and `is_flapping`, providing enough context for Severity scoring.

---

## 6. Severity → Correlation ⚠️ (Service name mismatch risk)

- **Severity** uses `serviceCriticality.ts` with service names like: `auth-service`, `payment-gateway`, `checkout-api`, `user-profile`, `search-indexer`, `internal-dashboard`, `sandbox-env`.
- **Correlation** uses `serviceGraph.json` with service names like: `database-primary`, `payments-service`, `checkout-service`, `frontend`, `auth-service`, `api-gateway`.

**Only `auth-service` appears in both**. The rest are different. A `payments-service` alert would get `unknown` criticality in Severity (no match) but would correctly correlate in Correlation's topology. Conversely, `payment-gateway` is tier-1 in Severity but doesn't exist in the topology graph.

**Impact**: Service criticality and topology are effectively disconnected. Service names must be aligned.

---

## 7. Correlation → Safety Gate → AI Layer ⚠️ (Type mismatch)

- Safety Gate's `applySafetyGate` expects its own `Incident` type (extending `Cluster`), but Correlation produces a different `Incident` type. These are imported from different files.
- AI Layer imports `Incident` from `safety-gate/types` in its `index.ts` — this creates a **circular dependency** (AI Layer → Safety Gate types → AI Layer types).
- AI Layer's Zod schema validates `suggestedSeverity` against `['critical', 'high', 'medium', 'low']` — **missing `'warning'`, `'info'`, `'unknown'`** from the current type system. Valid AI responses would be rejected.

---

## 8. Safety Gate → Batching ⚠️ (channelMapping divergence, in-memory store)

### Channel Mapping Divergence
- **Batching** imports `getDestinationChannel()` from `shared/channelMapping.ts` — returns string values like `'pagerduty'`, `'slack'`, `'email-discord'`.
- **Router** imports `severityToChannelMapping` and `NotificationChannel` enum from the **same file** — but these exports **do not exist** in the committed version of `channelMapping.ts`.

**Impact**: Router's `index.ts` will fail to compile because `NotificationChannel` and `severityToChannelMapping` are not exported from `channelMapping.ts`. Additionally, even if both were present, Batching maps `'info'` → `'email-discord'` while Router maps `'info'` → `NotificationChannel.DISCORD` (`'discord'`). These are different string values.

### Batching is In-Memory — CONFIRMED BUG RISK
Batching's `store.ts` uses a module-level `let currentWindow: CurrentWindow | null = null` — **plain in-memory state**. Every other stateful module (Dedup, Lifecycle, Severity, Cooldown, Correlation) uses Redis. Under horizontal scaling (multiple instances), each instance will have its own independent batch window, leading to:
- Inconsistent batch sizes
- Duplicate notifications from different instances

---

## 9. Batching → Cooldown ⚠️ (Shape mismatch)

- `applyCooldown(incident: Incident)` expects `Incident` from `correlation/types.ts`.
- It accesses `incident.root_cause.fingerprint` for cooldown keying.
- If the incident comes from Safety Gate (which uses a different `Incident` shape where `root_cause` is `{ service, alert, confidence } | null`), `incident.root_cause.fingerprint` would be `undefined`.
- Cooldown does NOT handle `BatchedGroup` — it only handles `Incident`. But Batching's flush outputs `BatchedGroup[]`, not `Incident[]`. There is no code path connecting `flushBatch()` output to Cooldown.

---

## 10. Cooldown → Router ⚠️ (Channel mapping & type issues)

- Router's `formatNotification` correctly handles both `Alert` and `BatchedGroup` (from `alert.types.ts`), but the `BatchedGroup` shape it expects differs from what Batching produces (see §1).
- Router's `route()` function expects `Alert | BatchedGroup` but Cooldown outputs `CooldownResult` (a `{ allowed: boolean; suppressedCount: number }` object) — there is no code path that transforms Cooldown's output into something Router can consume.
- Missing credentials fail **silently at send time**, not at startup — adapters return `{ success: false, retryable: false }` if credentials are missing. This is correct per the current implementation but could be improved with a startup check.

---

## Cross-Cutting Checks

### Zero Missed Critical Alerts ⚠️

**Risk found**: A critical alert entering through Batching's `submitToBatch` with `severity === 'critical'` bypasses batching and calls `forwardCriticalFn()`. However, if `forwardCriticalFn` is never registered (i.e., `setForwardCriticalCallback` is never called), the critical alert is **silently dropped** with only a `logger.warn`. This violates the zero-missed-critical guarantee.

### Fail-Open Consistency ✅ (Mostly)

All Redis-dependent modules implement fail-open:
- **Dedup**: Forwards alert on Redis failure ✅
- **Lifecycle**: Returns default state on Redis failure ✅
- **Severity**: Returns frequency=1 on Redis failure ✅
- **Cooldown**: ❌ Does **not** have a try/catch around its Redis operations — a Redis failure will throw and could crash the pipeline.

### Fingerprint Identity ✅

Fingerprints are generated once in normalization (SHA-256 via `shared/crypto.ts`) and never regenerated downstream. All stages use the fingerprint as-is for Redis key construction.

### Config Sprawl ⚠️

| Constant | Module | Value | Notes |
|----------|--------|-------|-------|
| Dedup TTL (critical) | `dedup/config.ts` | 60s | |
| Dedup TTL (high) | `dedup/config.ts` | 300s | ❌ `high` no longer exists |
| Dedup TTL (medium) | `dedup/config.ts` | 900s | ❌ `medium` no longer exists |
| Dedup TTL (low) | `dedup/config.ts` | 1800s | ❌ `low` no longer exists |
| History TTL | `severity/config/thresholds.ts` | 604800s (7d) | |
| Lifecycle TTL (active) | `lifecycle/lifecycle.service.ts` | 3600s (1h) | Inline constant |
| Lifecycle TTL (resolved) | `lifecycle/lifecycle.service.ts` | 300s (5m) | Inline constant |
| Correlation TTL | `correlation/incidentStore.ts` | 300s (5m) | Inline constant |
| Cooldown (critical) | `cooldown/config.ts` | 30s | |
| Cooldown (warning) | `cooldown/config.ts` | 5m | |
| Cooldown (info) | `cooldown/config.ts` | 30m | |
| Noisy threshold | `severity/config/thresholds.ts` | 20 | |
| Flap threshold | `lifecycle/config.ts` | 4 transitions | |
| Flap window | `lifecycle/config.ts` | 10m | |
| Stale timeout | `lifecycle/config.ts` | 1h | |
| Max group size | `correlation/index.ts` | 100 | Inline constant |
| Router max retries | `router/index.ts` | 3 | |
| Router backoff | `router/index.ts` | 2000ms | |

**Concern**: Lifecycle and Correlation TTLs are defined as inline constants rather than in config files. The dedup config uses the old 4-tier severity values.

---

## Summary of Findings by Priority

### 🔴 Critical (Risk to zero-missed-critical guarantee)
1. **Severity type mismatch**: 5+ modules still use old `high/medium/low` severity values → type errors and wrong runtime behavior.
2. **Duplicate `Incident` type**: Correlation and Safety Gate define incompatible `Incident` shapes → `root_cause.fingerprint` access will crash.
3. **AI Layer Zod schema rejects new severity values**: `warning`/`info` suggestions treated as malformed → AI always returns null for valid responses.
4. **Batching critical-bypass silent drop**: If `forwardCriticalFn` is never registered, critical alerts are logged and dropped.
5. **Router `channelMapping.ts` missing exports**: `NotificationChannel` and `severityToChannelMapping` not exported → Router compilation fails.

### 🟡 Medium (Functionality bugs)
6. **Duplicate `BatchedGroup` type**: `alert.types.ts` vs `batching/types.ts` — structurally incompatible.
7. **Batching is in-memory**: All other stateful modules use Redis. In-memory batching breaks under horizontal scaling.
8. **Cooldown does not handle `BatchedGroup`**: Only accepts `Incident`, but Batching outputs `BatchedGroup[]`.
9. **Service name mismatch**: Severity's `serviceCriticality` and Correlation's `serviceGraph.json` use different service names.
10. **Cooldown has no fail-open for Redis**: A Redis failure will throw unhandled.

### 🟢 Low (Cleanup / tech debt)
11. **Parsers still in `src/ingest/parsers/`**: Stale structure from before normalization was split out.
12. **Dedup count not propagated downstream**: "Fired N times" data is tracked but not forwarded.
13. **Inline TTL constants**: Lifecycle and Correlation TTLs should be in config files.
14. **channelMapping value mismatch**: Batching says `'email-discord'`, Router says `'discord'` for info severity.
15. **No code path connecting Cooldown output to Router input**: `CooldownResult` is `{ allowed, suppressedCount }`, not an `Alert` or `BatchedGroup`.
