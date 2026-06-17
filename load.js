// Hammers /work forever so dashboards light up. Run: npm run load
const INTERVAL_MS = 400;

async function tick() {
  try {
    const res = await fetch('http://localhost:8080/work');
    const body = await res.json();
    console.log(res.status, body.traceId);
  } catch (err) {
    console.error('request failed — is app.js running?', err.message);
  }
}

console.log('load generator: GET /work every', INTERVAL_MS, 'ms — Ctrl+C to stop');
setInterval(tick, INTERVAL_MS);
