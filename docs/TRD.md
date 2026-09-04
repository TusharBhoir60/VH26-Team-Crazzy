# Technical Requirements Document — Alert Fatigue Buster

## 1. System Overview

Single monolithic Node.js service, modular internally by pipeline stage. Sits between monitoring tool webhooks (inbound) and notification channel APIs (outbound). Redis for ephemeral state (dedup, cooldown, batching windows). Supabase (Postgres) for durable history and dashboard queries. React/Vite frontend as a separate package in the same repo, consuming read-only REST endpoints.

## 2. Tech Stack + Package List

### Backend
| Purpose | Package | Version pin |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | ^5.x |
| Web framework | express | ^4.x |
| Redis client | ioredis | ^5.x |
| Postgres client | pg | ^8.x |
| Env config | dotenv | ^16.x |
| Validation | zod | ^3.x |
| HTTP client (outbound: Slack/PagerDuty/Groq) | axios | ^1.x |
| Logging | pino | ^9.x |
| Testing | jest, ts-jest, supertest | latest |
| Security middleware | helmet | ^7.x |
| Rate limiting | express-rate-limit | ^7.x |
| YAML parsing (dependency graph config) | js-yaml | ^4.x |
| UUID generation | uuid | ^9.x |

### Frontend (dashboard/)
| Purpose | Package |
|---|---|
| Framework | react ^18.x, react-dom ^18.x |
| Build tool | vite ^5.x |
| Charts | recharts |
| HTTP client | axios |
| Styling | tailwindcss |

### Infra
- Redis (Docker image: redis:7-alpine, or Supabase-compatible managed Redis if used)
- Supabase (hosted Postgres, free tier)
- Docker Compose for local orchestration (app + Redis; Postgres via Supabase remote)
- Groq API (stretch — narrative generation, severity fallback)

## 3. API Endpoints — Full Specification

### 3.1 Ingest Endpoints (inbound webhooks)

**POST /webhook/prometheus**
- Consumes Alertmanager webhook format
- Request body:
```json
{
  "receiver": "string",
  "status": "firing | resolved",
  "alerts": [
    {
      "status": "firing | resolved",
      "labels": { "alertname": "string", "severity": "string", "service": "string", "instance": "string" },
      "annotations": { "summary": "string", "description": "string" },
      "startsAt": "ISO8601",
      "endsAt": "ISO8601",
      "fingerprint": "string"
    }
  ]
}
```
- Response: `200 { "received": number, "processed": number }`

**POST /webhook/datadog**
- Consumes Datadog webhook format
- Request body:
```json
{
  "alert_type": "error | warning | success",
  "event_type": "string",
  "title": "string",
  "body": "string",
  "aggregation_key": "string",
  "tags": ["string"],
  "date": "unix_timestamp"
}
```
- Response: `200 { "received": number, "processed": number }`

### 3.2 Dashboard API Endpoints (outbound, read-only)

**GET /api/stats**
- Query params: `?window=1h|24h|7d` (default 24h)
- Response:
```json
{
  "raw_alert_count": number,
  "notifications_sent": number,
  "reduction_percent": number,
  "critical_alerts_suppressed": 0,
  "avg_mttr_seconds": number,
  "false_positive_rate": number
}
```

**GET /api/alerts/recent**
- Query params: `?limit=50&status=firing|resolved|all`
- Response:
```json
{
  "alerts": [
    {
      "fingerprint": "string",
      "alertname": "string",
      "service": "string",
      "severity": "critical|high|medium|low",
      "status": "firing|flapping|resolved",
      "received_at": "ISO8601",
      "cluster_id": "uuid | null"
    }
  ]
}
```

**GET /api/clusters**
- Query params: `?active=true|false`
- Response:
```json
{
  "clusters": [
    {
      "cluster_id": "uuid",
      "severity": "critical|high|medium|low",
      "root_cause": { "service": "string", "alert": "string", "confidence": "high|medium|low" },
      "affected_services": ["string"],
      "downstream_count": number,
      "raw_alert_count_suppressed": number,
      "ai_narrative": "string | null",
      "created_at": "ISO8601"
    }
  ]
}
```

**GET /api/clusters/:cluster_id**
- Response: single cluster object (same shape as above) + full alert list within cluster

### 3.3 Health/Ops

**GET /health**
- Response: `200 { "status": "ok", "redis": "connected|down", "db": "connected|down" }`

## 4. Outbound Integrations

| Channel | Method | Auth |
|---|---|---|
| PagerDuty | Events API v2 (POST) | Integration key (env: `PAGERDUTY_ROUTING_KEY`) |
| Slack | Incoming Webhook (POST) | Webhook URL (env: `SLACK_WEBHOOK_URL`) |
| Discord | Webhook (POST) | Webhook URL (env: `DISCORD_WEBHOOK_URL`) |
| Email | SMTP or transactional API (e.g. Resend) | API key (env: `EMAIL_API_KEY`) |
| Groq | Chat completions API (POST) | API key (env: `GROQ_API_KEY`) |

## 5. Non-Functional Requirements

- Ingest endpoint must respond within 200ms (ack fast, process async if needed) — monitoring tools retry/timeout on slow webhook responses
- Redis operations for dedup/cooldown must not add more than ~5ms per alert on the hot path
- System must not crash or drop alerts if Redis is temporarily unavailable — fail open (pass alert through unfiltered) rather than fail closed (silently drop) — critical alert recall requirement from PRD
- All outbound sender calls (Slack/PagerDuty/Discord/Email) wrapped in try/catch with logging — one channel failing must not block others

## 6. Environment Variables

```
PORT=8080
REDIS_URL=redis://localhost:6379
DATABASE_URL=<supabase_connection_string>
PAGERDUTY_ROUTING_KEY=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
EMAIL_API_KEY=
GROQ_API_KEY=
NODE_ENV=development
```

## 7. Deployment

- `docker-compose.yml`: app service + redis service; Postgres via remote Supabase connection string
- Local fallback: Postgres container in Docker Compose if Supabase unreachable during demo (documented in DEPLOYMENT.md)
