# Demo Runbook — 5-7 Minute Walkthrough

## Pre-Demo Checklist (do this 15 min before your slot, not on stage)

1. `docker-compose up -d` — start Redis + app; confirm `docker-compose ps` shows both healthy
2. `curl http://localhost:8080/health` — confirm `{"status":"ok","redis":"connected","db":"connected"}`
3. `ts-node scripts/seed-demo-data.ts` — populate historical data (run ONCE, re-running duplicates data — check row counts if repeating)
4. `cd dashboard && npm run dev` — start frontend, confirm loads at localhost:5173 with historical charts already populated (not empty/zero state)
5. Open dashboard in browser, full-screen, judges-facing display — verify VolumeChart shows a 48h trend, StatsCards show non-zero reduction %
6. Open a second terminal, `cd` to repo root, have `ts-node scripts/alert-generator.ts --scenario=X` commands typed/ready (not yet run) for the two live scenarios below
7. Close unrelated tabs/apps — nothing else visible during demo

## Timeline (5-7 min)

**0:00–0:30 — Problem, one sentence**
"On-call engineers get buried in alert noise — one outage can trigger 500 alerts, so people mute everything and miss the one that matters. We built the filter that sits in between."

**0:30–1:15 — Show the lived-in dashboard first**
Point at StatsCards + VolumeChart already showing historical reduction trend (~50-65% from seeded data). "This is 48 hours of simulated production traffic — you can already see the reduction pattern."
Don't over-explain the seeded data as seeded — frame it as "here's what steady-state looks like," then move to live proof.

**1:15–3:00 — Live Scenario B: Cascade Outage (the correlation proof)**
Run: `ts-node scripts/alert-generator.ts --scenario=cascade-outage --target=http://localhost:8080/webhook/prometheus`
While it runs (~3 seconds of alert firing), narrate: "Database just went down — that's cascading through auth, payments, checkout, and frontend. In a raw setup, that's 5 separate pages."
Point at dashboard ClusterView updating live: 1 cluster, root_cause=database, 5 affected services, 1 notification.
"One message, root cause identified, instead of five pages with no context."

**3:00–4:30 — Live Scenario E: Critical Buried in Noise (the non-negotiable proof)**
Run: `ts-node scripts/alert-generator.ts --scenario=critical-buried --target=http://localhost:8080/webhook/prometheus`
Narrate while it runs: "Now watch this — I'm firing 300 low-priority noise alerts, and hiding one real critical alert — database down — right in the middle of that flood."
Point at AlertFeed/notification log: critical alert appears immediately, not delayed by the batch window around it.
"This is the constraint that matters most — no matter how much noise is happening, a real emergency never gets buried. That's enforced, not hoped for — deterministic safety rules guarantee it."

**4:30–5:30 — Differentiation, fast**
"Alertmanager and Datadog already do basic dedup and grouping — we're not claiming to invent that. What they don't do: adaptive cooldowns that scale by severity, and free, self-hosted correlation across a dependency graph. The AI-powered tools that do correlation — OpenObserve, incident.io — gate it behind paid enterprise platforms. Ours is a drop-in proxy, works with your existing stack, no migration."

**5:30–6:30 (if time) — AI layer + safety design, if asked or if time remains**
"We also layer in AI for root-cause narratives and severity suggestions — but it's advisory only. A deterministic safety gate enforces that critical alerts can never be downgraded and AI can never suppress anything. AI helps explain, it doesn't get to decide."

**6:30–7:00 — Close**
"50%+ reduction in notification volume, zero missed criticals, running entirely self-hosted. That's the pitch."

## Fallback / Risk Mitigation

- If live demo network/WiFi is unreliable: everything above runs fully local via Docker Compose — no external dependency except Groq API for AI narrative (non-critical path, fails open if unreachable, demo still works without it)
- If Supabase realtime is the connection at risk: confirm ahead of time the polling fallback (10s) is working, in case realtime subscription drops during the demo — don't rely on the live pipeline visibly proving that fallback on stage, just confirm it privately beforehand
- If a live scenario script errors mid-run: have terminal output visible so judges see it's a real system responding, not a canned video — a visible retry/error handled gracefully is more credible than a black-box "it just works" claim
- Time buffer: scenarios B and E are the two that MUST run — cut the AI/safety-design section first if running long, never cut Scenario E
