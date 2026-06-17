# otel-demo

A minimal Node/Express app that emits all three observability pillars to a local
`grafana/otel-lgtm` stack via OpenTelemetry (OTLP). Built for learning.

## The big picture

```
app.js ──(OTLP HTTP :4318)──▶ otel-lgtm container
   │                              ├─ collector fans out to:
   │                              ├─ Tempo       (traces)    query :3200
   │                              ├─ Prometheus  (metrics)   query :9090
   │                              └─ Loki        (logs)      query :3100
   └─ winston logs get trace_id injected automatically  ─────────▶ Grafana :3000
```

- **Read ports** (3100 / 9090 / 3200) = where Grafana queries from.
- **Ingest port** (4318) = where this app pushes to.
- Storage = chunk/block files inside the container (`/data/{loki,prometheus,tempo}`),
  NOT a relational DB. The only SQLite in the stack is `grafana.db` (dashboards/users).

## Prerequisites

The stack must be running:

```bash
docker run -d --name lgtm -p 3000:3000 -p 4317:4317 -p 4318:4318 grafana/otel-lgtm
```

Grafana UI: http://localhost:3000  (login admin / admin)

## Run

```bash
npm install
npm start        # terminal 1 — starts the app on :8080
npm run load     # terminal 2 — fires GET /work every 400ms
```

Or hit it manually: `curl localhost:8080/work`
(~15% of requests fail on purpose so you get error rates + error traces.)

## What to explore in Grafana (Explore tab, pick the datasource)

1. **Prometheus** — metrics
   - `demo_work_requests_total` — the custom counter from app.js
   - `rate(http_server_request_duration_seconds_count[1m])` — request rate (RED "R")
2. **Tempo** — traces
   - Search → service `otel-demo` → click a trace → see the span waterfall
   - Open a 500 trace to see an errored request
3. **Loki** — logs
   - `{service_name="otel-demo"}` → your winston lines, each carrying a `trace_id`
4. **The pivot** — in a Tempo trace, copy the `trace_id`, then in Loki run
   `{service_name="otel-demo"} | json | trace_id="<paste>"` to jump from a slow
   span straight to its logs. That's metrics → traces → logs in action.

## Files

| File | Role |
|------|------|
| `tracing.js` | All OTel wiring. Loaded via `-r` before app code. |
| `app.js` | Express server emitting traces + a custom metric + logs. |
| `load.js` | Traffic generator. |

## Inspect the storage yourself

```bash
docker exec -it lgtm sh -c "ls -R /data/tempo /data/loki /data/prometheus"
```

You'll see WAL files (RAM being persisted) and block dirs — never a .sql table.
