// Loaded via `node -r ./tracing.js app.js` so instrumentation is in place
// BEFORE express/http/etc. are required. This is the whole OTel wiring.

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { HostMetrics } = require('@opentelemetry/host-metrics');

const OTLP = 'http://localhost:4318'; // grafana/otel-lgtm OTLP HTTP ingest

const sdk = new NodeSDK({
  serviceName: 'otel-demo',

  // PILLAR 1 — traces -> Tempo
  traceExporter: new OTLPTraceExporter({ url: `${OTLP}/v1/traces` }),

  // PILLAR 2 — metrics -> Prometheus (exported every 5s)
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${OTLP}/v1/metrics` }),
    exportIntervalMillis: 5000,
  }),

  // PILLAR 3 — logs -> Loki (winston instrumentation below routes app logs here)
  logRecordProcessors: [
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${OTLP}/v1/logs` })),
  ],

  instrumentations: [
    getNodeAutoInstrumentations({
      // We ship logs via the explicit OpenTelemetryTransportV3 in app.js instead,
      // so disable the instrumentation's own log-sending to avoid duplicates.
      // It still injects trace_id/span_id into the log context.
      '@opentelemetry/instrumentation-winston': { disableLogSending: true },
    }),
  ],
});

sdk.start();

// PILLAR 4 (resource metrics) — CPU + RAM of this process AND the host.
// Must start AFTER sdk.start() so it uses the SDK's MeterProvider, which
// exports through the same OTLP /v1/metrics pipeline -> Prometheus.
// Emits: process.cpu.*, process.memory.*, system.cpu.*, system.memory.*
const hostMetrics = new HostMetrics({ name: 'otel-demo' });
hostMetrics.start();

process.on('SIGTERM', () => sdk.shutdown().finally(() => process.exit(0)));
process.on('SIGINT', () => sdk.shutdown().finally(() => process.exit(0)));
