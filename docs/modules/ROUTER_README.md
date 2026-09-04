# Router — Implementation Brief for Antigravity

## Context

```
Adaptive Cooldown → Router → PagerDuty (critical) / Slack (medium) / Email-Discord (low)
```

Router is the final stage. It receives cooldown-cleared incidents (or batched
groups) and actually delivers notifications to the destination channel determined
by severity. This is the first stage that talks to real external systems — real
credentials, real API calls, real failure modes to handle.

## Severity → channel mapping (shared, per diagram)

Reuse `src/shared/channelMapping.ts` (already introduced in the Batching brief —
confirm it exists; create it here if Batching hasn't been built yet) rather than
redefining this mapping:

```
critical → PagerDuty
warning/medium → Slack
info/low → Email / Discord
```

## Uniform content format

Per the current decision, notification content is **the same plain structured
text across every channel** — no channel-specific rich formatting (no PagerDuty
custom fields beyond what's required to trigger, no Slack Block Kit, no HTML
email). This keeps the initial implementation simple and avoids maintaining
per-channel templates; revisit later if channel-native formatting becomes a
priority.

- Build one shared content-generation function,
  `src/router/formatNotification.ts` — `formatNotification(incidentOrBatch):
  string`, producing the plain text body used regardless of destination.
- Content should include: severity, incident/root-cause summary, contributing
  alert count, AI narrative if present (`aiEnrichment.narrative`), and — for
  batched groups — the count of incidents in the group and, where relevant, the
  cooldown-suppressed count from the previous stage.
- Each channel adapter takes this same string and wraps only the minimum required
  by that channel's API (e.g. PagerDuty's `summary` field, Slack's `text` field,
  email's body) — no separate content logic per channel.

## Real channel integrations

Three adapters, one per channel, each implementing a common interface:

```
ChannelAdapter: {
  send(content: string, incident: Incident | BatchedGroup): Promise<DeliveryResult>
}
```

- `src/router/adapters/pagerduty.ts` — PagerDuty Events API v2 (Trigger event),
  using `PAGERDUTY_ROUTING_KEY` / `PAGERDUTY_API_KEY` from env.
- `src/router/adapters/slack.ts` — Slack Incoming Webhook or Web API (`chat.postMessage`),
  using `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` from env.
- `src/router/adapters/email.ts` (and/or Discord webhook) — email via whatever
  provider the team already uses (confirm — SMTP, SES, SendGrid?) or a Discord
  webhook URL from env (`DISCORD_WEBHOOK_URL`). Flag this to me if you want
  Discord and email as two separate adapters rather than one "low severity"
  adapter — the diagram shows them as one box (Email/Discord) but they're
  different integrations.
- All credentials from env vars, never hardcoded, never logged — same discipline
  as the AI Layer's `GROQ_API_KEY`.

## Failure handling: retry with backoff, then dead-letter

- On a failed send (network error, non-2xx response, timeout), retry with
  exponential backoff — recommend a small, bounded retry count (config constant,
  e.g. 3 attempts: immediate, then ~2s, then ~8s) rather than unbounded retries
  that could delay other notifications behind it.
- If all retries are exhausted, **dead-letter** the notification: write it to a
  Redis-backed dead-letter store (`router:deadletter`, similar pattern to Safety
  Gate's quarantine queue) with full context — destination channel, content,
  incident fingerprint, error details, retry history — so nothing is silently
  lost. This is the same "never drop, always leave a trail" principle used since
  Ingest's dead-letter handling.
- Dead-lettered critical-severity notifications need to be **especially visible** —
  recommend a distinct log level/metric (`router.critical_delivery_failed`) beyond
  the generic dead-letter path, since a failed PagerDuty page is the single
  highest-stakes failure mode in this entire system. Consider whether a failed
  critical delivery should also attempt a fallback channel (e.g. Slack) as a
  last-resort safety net — flag if you want that added; current scope treats
  retry-then-dead-letter as sufficient and doesn't cross-channel-fallback
  automatically.
- Retries should not block processing of other incidents — run retry backoff
  asynchronously per-notification, not as a blocking loop in the main request
  path.

## Deliverables for this task

- `src/router/index.ts` — `route(incidentOrBatch): Promise<void>` entry point,
  called from Cooldown's output path; looks up channel via
  `channelMapping`, formats content, dispatches to the right adapter
- `src/router/formatNotification.ts` — shared plain-text content generator
- `src/router/adapters/pagerduty.ts`, `slack.ts`, `email.ts` (and/or `discord.ts`)
- `src/router/retry.ts` — shared retry-with-backoff wrapper used by all adapters
- `src/router/deadletter.ts` — Redis-backed dead-letter store
- `src/router/types.ts` — `ChannelAdapter`, `DeliveryResult`
- Unit/integration tests: successful delivery per channel (mocked API), retry
  triggers on transient failure and succeeds on second attempt, exhausted retries
  → dead-lettered with full context, critical-delivery-failure gets distinct
  logging, content format is identical across channels regardless of destination

## Explicitly out of scope here

- Cross-channel fallback on critical failure (flagged above — not built unless
  requested)
- A UI/tool for inspecting or replaying the dead-letter queue (same "known
  manual-ops gap" pattern as Safety Gate's quarantine — say the word if you want
  this built)
- Channel-native rich formatting (explicitly excluded per current decision)
