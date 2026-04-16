You are building a production-ready NextJS (App Router) application.

## GOAL

Build a multi-user SaaS dashboard that:

- Manages Prometheus Blackbox jobs (1 job per user)
- Allows users to add targets
- Polls alerts from Prometheus API
- Sends SMTP email alerts
- Displays dashboard metrics

---

## HARD CONSTRAINTS

- Single Prometheus instance
- Each user = exactly ONE job
- job_name = username
- label required: username=<username>
- Only Blackbox exporter jobs allowed
- No job creation via API (only during user registration)
- Users can ONLY manage their own targets
- Prometheus API is internal-only (server-side access)

---

## STACK

- NextJS (App Router)
- TailwindCSS + DaisyUI
- Axios
- PostgreSQL
- Nodemailer
- No external state managers

---

## PROJECT STRUCTURE (STRICT)

Generate code using this structure:

```id="w7txsy"
app/
  api/
    auth/
    targets/
    alerts/
    stats/
    config/ (admin only)
  dashboard/
  settings/
lib/
  db.ts
  prometheus.ts
  configManager.ts
  alertPoller.ts
  mailer.ts
  cache.ts
types/
```

---

## DATABASE (PostgreSQL)

Create minimal schema:

```sql id="bjvz8u"
users(id, username, email, role, created_at)

alert_events(
  id,
  fingerprint UNIQUE,
  username,
  alert_name,
  instance,
  status,
  starts_at,
  ends_at,
  last_sent_at
)

config_versions(
  id,
  version,
  config_yaml,
  created_at
)
```

---

## PROMETHEUS CONFIG

Path:

```id="7dpfz7"
/configs/prometheus.yml
```

### Job Template

```yaml id="d7ht9q"
- job_name: "<username>"
  metrics_path: /probe
  params:
    module: [http_default]
  static_configs:
    - targets: []
      labels:
        username: "<username>"
```

---

## USER REGISTRATION FLOW

1. Create user in DB
2. Append job to config
3. Backup config (keep last 10)
4. Run:
   promtool check config
5. If valid:
   POST /-/reload
6. If fail:
   rollback + abort user creation

---

## TARGET MANAGEMENT

API:

```id="rx6p0u"
POST /api/targets
GET  /api/targets
```

Behavior:

- Add targets to user’s job
- Deduplicate targets
- Validate config
- Reload Prometheus

---

## PROMETHEUS API USAGE

Use:

- GET /api/v1/alerts
- GET /api/v1/query
- GET /api/v1/query_range

Filter ALWAYS by:

```id="c8h3h9"
labels.username === current_user
```

---

## ALERT POLLER

- Runs every 60 seconds

Flow:

1. Fetch /api/v1/alerts
2. For each alert:
   - extract alertname, instance, username, status

3. fingerprint:

```id="p9qg2m"
hash(username + alertname + instance)
```

4. Dedup:

- ignore unchanged alerts
- store new or updated in DB

---

## EMAIL ALERTING

Trigger when:

- alert becomes firing
- alert resolved

Rules:

- throttle: 10 minutes
- retry: 3 times

Use Nodemailer

---

## DASHBOARD

Route:

```id="nbj6je"
/dashboard
```

Show:

- Firing alerts
- Impacted targets
- Total alerts
- Total targets
- Recent incidents (7–30 days)

---

## CACHE STRATEGY

- Global server cache
- Refresh every 5 minutes

```ts id="j0g1qb"
cache = { alerts, stats, targets, updatedAt };
```

- All APIs read from cache
- Filter per user

---

## SECURITY

- No direct Prometheus access from client
- All APIs enforce username from auth
- Admin-only:

```id="6v1xap"
/api/config/*
```

---

## CONFIG MANAGEMENT (ADMIN)

- Read config
- View versions
- Rollback

NO job creation via API

---

## OUTPUT REQUIREMENTS

- Generate complete working code
- Keep code minimal and clean
- No explanations
- No comments except critical ones
- No repetition
- No unused code

---

## PRIORITY

1. Backend correctness
2. Config safety (no corruption)
3. Alert dedup accuracy
4. Performance (cache)
