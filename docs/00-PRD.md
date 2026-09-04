# Product Requirements Document — Alert Fatigue Buster

## 1. Problem Statement

On-call engineers drown in alert noise. Root causes:
- A single flaky pod spams 100 identical pings (no deduplication)
- A database outage triggers 500 downstream alerts in seconds (no correlation to root cause)
- Alerts flap: fire → resolve → fire in a loop (no lifecycle awareness)
- Engineers respond by muting entire channels — and then miss the alert that actually mattered

**Consequence:** Mean Time to Respond (MTTR) balloons from ~5 minutes to 45+ minutes during real incidents, because the signal is buried in noise.

**Evidence this is a real, quantified problem (not assumed):**
- GitLab SRE team: on-call paged up to 10 times per service during degradation (3-5 SLIs per service, each alerting independently); 50+ pages during a site-wide outage
- Industry case study: one fintech team reduced alerts from ~400/night to 8/night through manual noise-engineering discipline, cutting a 38% false-positive rate
- Industry-wide: ~40% of on-call engineers report burnout symptoms; teams with high alert volume see 3x higher attrition

## 2. What We're Solving (Scope Definition)

We are **not** building a better detection system — Prometheus/Datadog already detect anomalies correctly. We are solving **signal-to-noise on the notification layer**: deciding what actually needs a human right now vs. what is noise, a duplicate, or a downstream symptom of something already known.

This is a **middleware proxy** — it sits between monitoring tools (Prometheus, Datadog) and notification channels (Slack, PagerDuty, Discord, Email). It does not replace either side.

## 3. Goals

| Goal | Target |
|---|---|
| Alert volume reduction | 50%+ fewer notifications sent vs. raw alert count |
| Critical alert recall | 100% — zero real emergencies ever suppressed |
| MTTR improvement | Demonstrable reduction in demo (before/after comparison) |
| False-positive rate | Reduced vs. baseline (target: track and show downward trend) |
| Correlation accuracy | Correctly link downstream alerts to root cause in demo scenarios (DB cascade, bad deploy) |

## 4. Non-Goals

- Not a replacement for Prometheus/Datadog/Alertmanager — works alongside them
- Not a full observability platform (no distributed tracing, no log aggregation)
- Not claiming to be the first tool to do dedup/grouping — Alertmanager and Datadog already do this natively. Our differentiation is **adaptive severity-scaled cooldowns**, **dependency-graph-based correlation without vendor lock-in**, and **free/self-hosted deployment** vs. paid enterprise AI platforms (OpenObserve, incident.io) that gate correlation/narrative behind paid tiers.

## 5. Core Capabilities (MVP — must work in demo)

1. **Ingest** — webhook receiver for Prometheus Alertmanager and Datadog payload formats
2. **Deduplication** — collapse N identical alerts into 1, via fingerprint hashing
3. **Lifecycle tracking** — track fire → resolve state per alert, detect flapping
4. **Severity scoring** — rule-based auto-classification: Critical / High / Medium / Low
5. **Adaptive cooldown** — severity-scaled re-notify windows (critical: 1min, noisy: 30min)
6. **Batching** — group alert bursts within a time window into a single digest
7. **Correlation** — link downstream alerts to a likely root cause via a declared service-dependency graph
8. **Smart routing** — severity-based channel routing (Critical → PagerDuty, Medium → Slack, Low → Email)

## 6. Stretch Capabilities (only if MVP lands with time remaining)

- AI-generated root-cause narrative (Groq API) — turns a correlated cluster into a 2-sentence human-readable summary
- AI-assisted severity scoring fallback for alerts with no severity label
- Embedding-based alert similarity (catches semantically-same alerts with different labels)
- Web dashboard: live alert volume, before/after comparison, cluster/root-cause visualization
- Configurable rules via YAML/JSON instead of hardcoded logic

## 7. Competitive Differentiation

| Capability | Alertmanager / Datadog native | Paid AI platforms (OpenObserve, incident.io) | This project |
|---|---|---|---|
| Dedup, grouping, lifecycle | Yes | Yes | Yes |
| Adaptive severity-scaled cooldown | No (static intervals only) | Unclear/partial | **Yes — core differentiator** |
| Dependency-graph correlation | No (needs external system) | Yes, but paid/AI-credit gated | Yes — free, YAML-declared |
| AI root-cause narrative | No | Yes, paid | Stretch — free (Groq) |
| Deployment model | Self-hosted (Alertmanager) / SaaS (Datadog) | SaaS, paid, migration required | Self-hosted, free, drop-in — no migration |

**One-line pitch:** Existing free tools do mechanical dedup/grouping but no dependency-aware correlation. Existing AI-correlation tools gate that capability behind paid enterprise platforms and full observability migration. We deliver dependency-graph correlation and adaptive cooldowns free, self-hosted, and as a drop-in proxy in front of your existing stack.

## 8. Success Criteria for Demo

- Live demo ingesting simulated alert bursts (real Prometheus/Datadog webhook format)
- Before/after volume comparison shown (target: 50%+ reduction visible)
- At least one correlated incident scenario demonstrated end-to-end (e.g., DB failure → 4 downstream alerts → 1 notification with root cause identified)
- Zero critical alerts suppressed across all demo scenarios
- Justification narrative ready: why this beats Alertmanager alone and why it beats paid AI platforms

## 9. Constraints

- 30-hour build window
- 4-person team, parallel development across pipeline stages
- Must integrate with real Prometheus Alertmanager and Datadog webhook formats (not just simulated data)
