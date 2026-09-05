# Testing Document — Alert Fatigue Buster

## 1. What "correct" means, precisely

Three claims to prove, each needs its own test class:

1. **Noise reduction** — 50%+ fewer notifications sent than raw alerts received
2. **Zero critical suppression** — every alert classified `critical` results in exactly one notification reaching its channel, never zero
3. **Correctness of mechanisms** — dedup, lifecycle, correlation, batching, cooldown each individually behave per spec, not just "the pipeline runs without crashing"

Passing "113/113 unit tests" proves individual stage logic. It does NOT prove the pipeline as a whole reduces noise or protects criticals — that requires integration + load tests below.

## 2. Test Pyramid

```
        /\
       /  \      E2E Chaos Tests (Redis down, AI timeout, partial failure)
      /----\
     /      \    Integration Tests (full pipeline, synthetic bursts)
    /--------\
   /          \  Unit Tests (per-stage, already have 113)
  /------------\
```

## 3. Synthetic Load Test Scenarios (integration level)

Each scenario has an explicit expected outcome — test asserts against it, not just "no crash."

### Scenario A — Duplicate storm
- Input: 1 alert, fired 100 times with identical fingerprint, over 10 seconds
- Expected: 1 notification sent, `dedup_count = 99`
- Assert: `notifications.length === 1`, count field matches

### Scenario B — Cascade outage
- Input: alerts on `database`, `auth-service`, `payment-service`, `checkout-api`, `frontend` (per your `service-dependency-graph.yaml`) all firing within a 10s window
- Expected: 1 cluster formed, `root_cause.service === 'database'`, 1 notification (batched digest) instead of 5
- Assert: `cluster.affected_services.length === 5`, notification count === 1

### Scenario C — Flapping alert
- Input: same fingerprint fires → resolves → fires → resolves → fires, 5 cycles within 2 minutes
- Expected: state becomes `flapping` after 3rd cycle, cooldown extends to noisy-tier window (30min), notification count drops vs. naive (would be 5 separate fire notifications, should be ≤2)
- Assert: lifecycle state === 'flapping' by 3rd cycle, cooldown TTL reflects noisy tier

### Scenario D — Mixed severity burst (the core "50%+ reduction" proof scenario)
- Input: simulate a realistic incident — 200 raw alerts total: 150 duplicates of 3 distinct issues, 30 correlated cascade alerts (1 root + downstream), 20 standalone unique alerts
- Expected: notification count ≤ 100 (50% reduction), zero critical alerts among the 20 unique standalone missed
- Assert: `reduction_percent >= 50`, all critical-severity alerts in input have ≥1 corresponding notification in output

### Scenario E — Critical alert buried in noise
- Input: 1 genuine critical alert (e.g. `DatabaseDown`) fired once, simultaneously with 300 unrelated low/medium noise alerts (different services, no dependency relation) in the same window
- Expected: the critical alert is NOT suppressed by batching/cooldown/dedup logic meant for the noise — must generate its own immediate notification to PagerDuty regardless of batch window state
- Assert: notification for the critical fingerprint exists, `severity === 'critical'`, sent within immediate-flush window not the full 10s batch delay
- **This is the single most important test in the suite** — directly proves the PS's non-negotiable constraint

## 4. Chaos / Failure-Mode Tests

| Test | Setup | Expected behavior | Assert |
|---|---|---|---|
| Redis down during dedup | Kill Redis connection before sending alert | Alert passes through unfiltered (fail open), no crash | Notification still sent, no unhandled exception |
| Redis down during cooldown | Kill Redis before cooldown check | Alert not blocked by cooldown, sends | Notification sent despite missing cooldown state |
| Redis down during batching | Kill Redis mid-batch-window | Alert routes individually (no crash), or window recovers | No alert lost, no crash |
| AI Layer timeout (>2s) | Mock Groq client to hang | Safety Gate proceeds with `ai_narrative: null`, deterministic severity unaffected | Notification sent with null narrative field, correct severity |
| AI Layer errors (5xx) | Mock Groq client to throw | Same as timeout — fail open | Same assertions |
| AI attempts to de-escalate a critical | Mock AI response with `suggested_severity_escalation: 'low'` on a critical alert | Safety Gate ignores it | `severity_score` remains `'critical'` in output |
| One notification sender fails (Slack down) | Mock Slack webhook to 500 | PagerDuty/Email still attempt send independently | Other channels' notifications still succeed |
| Partial pipeline crash simulation | Kill process after Safety Gate, before Router (if durable checkpointing implemented) | Documented known gap if not yet implemented — otherwise assert recovery | Recovery test or explicit "not yet implemented" doc note |

## 5. Metrics to Capture During Test Runs (feed into dashboard + pitch)

```
raw_alert_count
notifications_sent
reduction_percent = (1 - notifications_sent/raw_alert_count) * 100
critical_alerts_total
critical_alerts_notified   -- must equal critical_alerts_total, always
false_positive_rate         -- notifications later marked as noise (manual/demo-scripted)
avg_correlation_accuracy    -- % of cascade scenarios where root_cause matched expected
```

## 6. Pass/Fail Criteria for "Done"

- Scenario D reduction_percent >= 50 — required
- Scenario E: 100% critical alerts notified — required, zero tolerance
- All chaos tests: zero unhandled exceptions, zero critical alerts lost — required
- Correlation accuracy on Scenario B >= 90% (root cause correctly identified) — required for pitch credibility
- Unit test suite: must cover the chaos-path branches explicitly (Redis-throws paths), not just happy path — audit existing 113 tests against this
