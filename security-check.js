const { testServer, request, register, login } = require('../tests/helpers');
async function main() {
  const app = await testServer(); let failed = 0; const rows = [];
  const check = (name, ok, detail) => { rows.push({ check: name, result: ok ? 'PASS' : 'FAIL', detail }); if (!ok) failed++; };
  try {
    const health = await request(app.baseUrl, '/api/health');
    check('Security headers', health.headers.get('x-frame-options') === 'DENY' && health.headers.get('x-content-type-options') === 'nosniff' && /default-src 'self'/.test(health.headers.get('content-security-policy') || ''), 'Nagłówki X-Frame-Options, X-Content-Type-Options i CSP.');
    const privateApi = await request(app.baseUrl, '/api/lists'); check('Authentication required', privateApi.status === 401, `GET /api/lists bez sesji: HTTP ${privateApi.status}`);
    const reg = await register(app.baseUrl, 'zap-check@example.com'); check('Registration validation baseline', reg.res.status === 201, `Rejestracja poprawnego konta: HTTP ${reg.res.status}`);
    const auth = await login(app.baseUrl, 'zap-check@example.com'); check('Session cookie flags', /HttpOnly/.test(auth.res.headers.get('set-cookie') || '') && /SameSite=Strict/.test(auth.res.headers.get('set-cookie') || ''), 'Flagi sesyjnego cookie.');
    const invalid = await request(app.baseUrl, '/api/auth/register', { method: 'POST', body: { email: 'nie-email', password: 'short' } }); check('Input validation', invalid.status === 400, `Niepoprawna rejestracja: HTTP ${invalid.status}`);
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), type: 'local security smoke checks; not a full penetration test', checks: rows, summary: { passed: rows.length - failed, failed, total: rows.length } }, null, 2));
    if (failed) process.exitCode = 1;
  } finally { await app.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
