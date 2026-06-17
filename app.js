const express = require('express');
const winston = require('winston');
const { OpenTelemetryTransportV3 } = require('@opentelemetry/winston-transport');
const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');

// Our own tracer — used to create MANUAL child spans inside the request,
// on top of the auto-generated http/express spans. This is what turns the
// trace waterfall from "flat" into something worth reading.
const tracer = trace.getTracer('otel-demo');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run `fn` inside a child span named `name`. The span auto-closes, and any
// thrown error is recorded on the span (exception event + ERROR status) so it
// shows up red in Tempo with the stack attached.
function withSpan(name, attributes, fn) {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}

// Fake auth check — fast, always succeeds.
async function checkAuth() {
  return withSpan('auth.check', { 'auth.method': 'token' }, async () => {
    await sleep(2 + Math.floor(Math.random() * 4)); // 2-5ms
    return { user: 'demo' };
  });
}

// Fake DB query with a nested cache lookup. Latency is variable (occasionally
// slow) so "High latency" / "Critical path" in Tempo actually have something to
// highlight. ~10% of queries throw to simulate a DB error.
async function queryWork() {
  return withSpan(
    'db.query',
    { 'db.system': 'postgresql', 'db.statement': 'SELECT * FROM work WHERE ready = true' },
    async (span) => {
      // nested cache lookup span
      const cached = await withSpan('cache.lookup', { 'cache.key': 'work:ready' }, async () => {
        await sleep(5 + Math.floor(Math.random() * 15)); // 5-20ms
        return Math.random() < 0.5; // 50% cache hit
      });
      span.setAttribute('cache.hit', cached);

      if (cached) {
        await sleep(5 + Math.floor(Math.random() * 10)); // fast path 5-15ms
      } else {
        // cache miss -> hit the "disk", occasionally a slow query
        const slow = Math.random() < 0.2;
        await sleep(slow ? 200 + Math.floor(Math.random() * 200) : 40 + Math.floor(Math.random() * 60));
        span.setAttribute('db.slow_query', slow);
      }

      if (Math.random() < 0.1) throw new Error('db connection reset');
      span.setAttribute('db.rows_returned', 1 + Math.floor(Math.random() * 5));
      return { rows: 1 };
    }
  );
}

// Two transports: Console (so you see logs in the terminal) and the OTel
// transport, which ships each record to the OTLP logs endpoint -> Loki.
// trace_id/span_id are attached automatically from the active span context.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new OpenTelemetryTransportV3(),
  ],
});

// A custom business metric, on top of the auto-generated http.server.* ones.
const meter = metrics.getMeter('otel-demo');
const workCounter = meter.createCounter('demo.work.requests', {
  description: 'Number of /work calls handled',
});

const app = express();

app.get('/work', async (req, res) => {
  const span = trace.getActiveSpan(); // the auto-created HTTP/express span (root)
  const traceId = span?.spanContext().traceId;
  const started = Date.now();

  try {
    await checkAuth();        // child span: auth.check
    await queryWork();        // child span: db.query -> cache.lookup

    const durationMs = Date.now() - started;
    workCounter.add(1, { route: '/work' });
    logger.info('work ok', { traceId, durationMs });
    res.json({ ok: true, traceId, durationMs });
  } catch (err) {
    // Record the failure on the ROOT span so the whole trace is flagged red
    // in Tempo, with the exception/stack attached. This is what you click into.
    span?.recordException(err);
    span?.setStatus({ code: SpanStatusCode.ERROR, message: err.message });

    const durationMs = Date.now() - started;
    logger.error('work failed', { traceId, durationMs, error: err.message });
    res.status(500).json({ ok: false, traceId, error: err.message });
  }
});

app.get('/', (_req, res) => res.send('otel-demo v2 — deployed via GitHub Actions CI/CD 🚀'));

app.listen(8080, () => logger.info('otel-demo listening', { port: 8080 }));
