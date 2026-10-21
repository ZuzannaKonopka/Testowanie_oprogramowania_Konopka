const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { testServer, request } = require('../tests/helpers');

async function main() {
  const users = Math.max(1, Math.min(100, Number(process.env.USERS) || 10));
  const requestsPerUser = Math.max(1, Math.min(1000, Number(process.env.REQUESTS_PER_USER) || 20));
  const app = await testServer();
  try {
    const health = await request(app.baseUrl, '/api/health');
    if (!health.ok) throw new Error('Endpoint health nie odpowiada poprawnie.');
    const samples = [];
    let errors = 0;
    const started = performance.now();
    await Promise.all(Array.from({ length: users }, async () => {
      for (let i = 0; i < requestsPerUser; i++) {
        const t0 = performance.now();
        try { const res = await request(app.baseUrl, '/api/health'); if (!res.ok) errors++; else await res.json(); }
        catch { errors++; }
        samples.push(performance.now() - t0);
      }
    }));
    const durationMs = performance.now() - started;
    samples.sort((a, b) => a - b);
    const percentile = p => samples[Math.min(samples.length - 1, Math.ceil(p * samples.length) - 1)] || 0;
    const report = {
      generatedAt: new Date().toISOString(),
      target: '/api/health',
      configuration: { concurrentWorkers: users, requestsPerWorker: requestsPerUser, totalRequests: users * requestsPerUser },
      results: { completed: samples.length, errors, errorRate: samples.length ? errors / samples.length : 0, durationMs: Number(durationMs.toFixed(2)), requestsPerSecond: Number((samples.length / (durationMs / 1000)).toFixed(2)), responseMs: { min: Number((samples[0] || 0).toFixed(2)), median: Number(percentile(.5).toFixed(2)), p95: Number(percentile(.95).toFixed(2)), p99: Number(percentile(.99).toFixed(2)), max: Number((samples.at(-1) || 0).toFixed(2)) } },
      notes: 'Wyniki dotyczą lokalnego endpointu health i zależą od sprzętu. Nie są gwarancją wydajności wdrożenia produkcyjnego.'
    };
    const out = path.join(__dirname, `results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2)); console.log(`\nZapisano raport: ${out}`);
    if (errors > 0) process.exitCode = 1;
  } finally { await app.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
