#!/usr/bin/env node
/**
 * Verifica un despliegue del backend de la Plataforma ESFOT.
 *
 * Uso:
 *   node scripts/verify-deploy.mjs https://tu-backend.onrender.com
 *   node scripts/verify-deploy.mjs https://tu-backend.onrender.com https://esfotroutes.vercel.app
 *
 * Comprueba, en este orden:
 *   1. Que el servicio responda (health check).
 *   2. Que CORS permita el origen del frontend (preflight real).
 *   3. Que la base de datos responda (login con credenciales falsas debe dar 401/400,
 *      nunca 5xx: un 500 ahí significa que Turso no está accesible).
 *
 * Sale con código 1 si algo falla, para poder usarlo en CI.
 */

const backend = (process.argv[2] || '').replace(/\/+$/, '');
const frontend = (process.argv[3] || 'https://tic-rutas-aprendizaje.vercel.app').replace(/\/+$/, '');

if (!backend) {
  console.error('❌ Falta la URL del backend.');
  console.error('   Uso: node scripts/verify-deploy.mjs https://tu-backend.onrender.com');
  process.exit(1);
}

const TIMEOUT_MS = 20_000;
let failures = 0;

const request = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });

const ok = (label, detail = '') => console.log(`✅ ${label}${detail ? ` — ${detail}` : ''}`);
const fail = (label, detail = '') => {
  failures += 1;
  console.error(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
};

const step = async (label, fn) => {
  try {
    await fn();
  } catch (err) {
    const cause = err?.cause?.code || err?.name || '';
    fail(label, `${err.message}${cause ? ` (${cause})` : ''}`);
  }
};

console.log(`\n🔍 Verificando ${backend}`);
console.log(`   Origen del frontend: ${frontend}\n`);

// ── 1. Health check ─────────────────────────────────────────────────────────
await step('Health check', async () => {
  const started = Date.now();
  const res = await request(`${backend}/api/health`);
  const ms = Date.now() - started;
  const text = await res.text();

  if (!res.ok) return fail('Health check', `HTTP ${res.status}`);

  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    return fail('Health check', 'la respuesta no es JSON (¿estás apuntando al frontend?)');
  }

  if (body?.status !== 'ok') return fail('Health check', `respuesta inesperada: ${text.slice(0, 80)}`);
  ok('Health check', `HTTP 200 en ${ms} ms`);
});

// ── 2. CORS para el origen del frontend ─────────────────────────────────────
await step('CORS', async () => {
  const res = await request(`${backend}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: frontend,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
    },
  });

  const allowOrigin = res.headers.get('access-control-allow-origin');
  const allowCreds = res.headers.get('access-control-allow-credentials');

  if (allowOrigin !== frontend) {
    return fail(
      'CORS',
      `el backend no permite ${frontend} (recibido: ${allowOrigin || 'ninguno'}). Revisa FRONTEND_URL en Render.`
    );
  }

  ok('CORS', `origen permitido${allowCreds === 'true' ? ' (credentials)' : ''}`);
});

// ── 3. Base de datos accesible ──────────────────────────────────────────────
await step('Base de datos', async () => {
  const res = await request(`${backend}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: frontend },
    body: JSON.stringify({
      email: 'verificacion-despliegue@example.invalid',
      password: 'contrasena-de-prueba-123',
    }),
  });

  if (res.status >= 500) {
    const text = await res.text();
    return fail('Base de datos', `HTTP ${res.status}: ${text.slice(0, 120)}`);
  }

  if (res.status === 429) {
    return fail('Base de datos', 'HTTP 429: rate limit agotado (sube RATE_LIMIT_MAX o espera 15 min)');
  }

  // 400/401 = el endpoint existe y consultó la BD. Cualquier otra cosa
  // (404, 405, 200) significa que la URL no es la del backend.
  if (res.status !== 400 && res.status !== 401) {
    return fail(
      'Base de datos',
      `HTTP ${res.status} en /api/auth/login: la URL no parece ser la del backend`
    );
  }

  ok('Base de datos', `respondió HTTP ${res.status} (credenciales falsas, como se esperaba)`);
});

// ── Resumen ─────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('🎉 Despliegue verificado: backend, CORS y base de datos OK.\n');
  process.exit(0);
}

console.error(`⚠️  ${failures} comprobación(es) fallaron.\n`);
process.exit(1);
