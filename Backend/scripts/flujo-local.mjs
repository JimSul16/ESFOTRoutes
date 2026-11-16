/**
 * Verificación LOCAL del fix de `PUT /api/auth/profile`.
 *
 * Levanta el backend en local (dev.db) y ejecuta el flujo completo:
 * registro → verificación → login → guardar perfil (career+semester SIN
 * uniqueId, el payload que envía el frontend) → smoke de los endpoints.
 *
 * Antes del fix, el paso de guardar perfil respondía 400
 * "El identificador único es obligatorio."
 *
 * Uso: node scripts/flujo-local.mjs
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT_LOCAL || 3100;
const API = `http://localhost:${PORT}`;
const TS = Date.now().toString().slice(-8);

// La BD local es la del .env activo (file:./dev.db).
const db = createClient({ url: 'file:./dev.db' });

const resultados = [];
const anotar = (fase, paso, esperado, obtenido, ok) => {
  resultados.push({ fase, paso, esperado, obtenido, ok });
  console.log(`${ok ? '  ✔' : '  ✘'} ${paso.padEnd(52)} esperado ${String(esperado).padEnd(26)} → ${obtenido}`);
};

const call = async (method, url, body, headers = {}) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { _raw: text.slice(0, 200) }; }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: `${e.name}: ${e.message}` } };
  } finally {
    clearTimeout(t);
  }
};

// ── Arranque del backend (sin envío real de correos) ────────────────────────
console.log(`\n🚀 Arrancando backend local en ${API} (dev.db, correos desactivados)…\n`);
const server = spawn(process.execPath, ['src/server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), MAIL_WEBHOOK_URL: '', SMTP_USER: '', SMTP_PASS: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logServidor = '';
server.stdout.on('data', (d) => { logServidor += d.toString(); });
server.stderr.on('data', (d) => { logServidor += d.toString(); });

const esperarSalud = async () => {
  for (let i = 0; i < 60; i++) {
    const h = await call('GET', `${API}/api/health`);
    if (h.status === 200) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

let exitCode = 1;
try {
  const salud = await esperarSalud();
  if (!salud) {
    console.log('✘ No arrancó el backend. Último log:\n' + logServidor.slice(-2000));
    process.exit(1);
  }
  console.log('  ✔ /api/health → 200\n');

  const email = `prueba.local.${TS}@gmail.com`;
  const password = 'PasswordSegura123!';
  const uniqueId = String(Math.floor(100000000 + Math.random() * 900000000));

  // ── Registro ──────────────────────────────────────────────────────────────
  console.log('── Registro ───────────────────────────────────────');
  const reg = await call('POST', `${API}/api/auth/register`, {
    name: 'Prueba Local Fix',
    email,
    password,
    career: 'Desarrollo de Software',
    semester: 4,
    uniqueId,
  });
  anotar('Registro', 'POST /api/auth/register', '201', `${reg.status}: ${reg.data.message || reg.data.error}`, reg.status === 201);

  const fila = (await db.execute({ sql: 'SELECT id, verificationToken FROM User WHERE email = ?', args: [email] })).rows[0];
  anotar('Registro', 'Usuario creado en dev.db', 'existe', fila ? `id ${fila.id}` : 'no existe', Boolean(fila));

  // ── Verificación ──────────────────────────────────────────────────────────
  console.log('\n── Verificación ────────────────────────────────────');
  const ver = await call('GET', `${API}/api/auth/verify/${fila?.verificationToken}`, undefined, { Accept: 'application/json' });
  anotar('Verificación', 'GET /api/auth/verify/:token', '200', `${ver.status}: ${ver.data.message || ver.data.error}`, ver.status === 200);

  // ── Login ─────────────────────────────────────────────────────────────────
  console.log('\n── Login ───────────────────────────────────────────');
  const login = await call('POST', `${API}/api/auth/login`, { email, password });
  anotar('Login', 'POST /api/auth/login', '200 con token', `${login.status}`, login.status === 200 && Boolean(login.data.token));
  const auth = { Authorization: `Bearer ${login.data?.token}` };

  // ── EL FIX: guardar perfil con career+semester y SIN uniqueId ─────────────
  console.log('\n── Perfil (regresión del fix) ──────────────────────');
  const guardar = await call('PUT', `${API}/api/auth/profile`, {
    name: 'Prueba Local Fix',
    career: 'Desarrollo de Software',
    semester: 5,
  }, auth);
  anotar('Perfil', 'PUT /auth/profile con career+semester (sin uniqueId)', '200',
    `${guardar.status}: ${guardar.data.message || guardar.data.error}`, guardar.status === 200);

  const sinCampos = await call('PUT', `${API}/api/auth/profile`, { name: 'Prueba Local Fix' }, auth);
  anotar('Perfil', 'PUT /auth/profile solo con name (sigue rechazándose)', '400 carrera',
    `${sinCampos.status}: ${sinCampos.data.error}`, sinCampos.status === 400);

  const perfil = await call('GET', `${API}/api/auth/profile`, undefined, auth);
  anotar('Perfil', 'GET /auth/profile refleja los cambios', 'semester 5',
    `${perfil.status} semester=${perfil.data?.semester} career=${perfil.data?.career}`,
    perfil.status === 200 && perfil.data?.semester === 5);

  // ── Smoke: endpoints que consume el frontend ──────────────────────────────
  console.log('\n── Endpoints que usa el frontend ───────────────────');
  const gets = [
    ['/api/auth/sessions', 'historial de sesiones'],
    ['/api/auth/my-progress', 'progreso propio'],
    ['/api/analytics/weekly-activity', 'analítica semanal'],
    ['/api/resources', 'recursos'],
    ['/api/resources/catalog', 'catálogo de recursos'],
    ['/api/routes', 'rutas'],
    ['/api/routes/my-routes', 'mis rutas'],
    ['/api/graph/subjects', 'materias del grafo'],
    ['/api/graph/recommendations', 'recomendaciones'],
  ];
  for (const [ruta, desc] of gets) {
    const r = await call('GET', API + ruta, undefined, auth);
    anotar('Smoke', `GET ${ruta} (${desc})`, '200', `${r.status}`, r.status === 200);
  }

  // ── Endpoints NO usados por el frontend (comportamiento esperado) ─────────
  console.log('\n── Endpoints que el frontend aún no consume ────────');
  const adminOnly = [
    ['GET', '/api/auth/admin/users', 'alias de /admin/users'],
    ['POST', '/api/auth/learning-paths', 'crear ruta de aprendizaje (ADMIN/TEACHER)'],
    ['GET', '/api/admin/users', 'listado de usuarios'],
    ['POST', '/api/admin/unlock/1', 'desbloquear usuario'],
  ];
  for (const [method, ruta, desc] of adminOnly) {
    const r = await call(method, API + ruta, method === 'POST' ? {} : undefined, auth);
    anotar('Sin usar', `${method} ${ruta} (${desc})`, '403 para STUDENT', `${r.status}`, r.status === 403);
  }

  const html = await fetch(`${API}/api/auth/unlock-account/token-falso`);
  anotar('Sin usar', 'GET /api/auth/unlock-account/:token (HTML)', '404/redirect controlado', `${html.status}`, html.status < 500);

  // ── Reporte ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(112));
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('FASE', 14) + pad('PASO', 56) + pad('RESULT.', 10) + 'DETALLE');
  console.log('─'.repeat(112));
  for (const r of resultados) {
    console.log(pad(r.fase, 14) + pad(r.paso, 56) + pad(r.ok ? '✔ PASS' : '✘ FAIL', 10) + `${r.esperado} ← ${r.obtenido}`);
  }
  const fallos = resultados.filter((r) => !r.ok).length;
  console.log('═'.repeat(112));
  console.log(`${resultados.length} pasos · ${resultados.length - fallos} ok · ${fallos} fallos`);
  exitCode = fallos ? 1 : 0;

  // ── Limpieza en dev.db ────────────────────────────────────────────────────
  if (fila) {
    for (const t of ['UserRole', 'Enrollment', 'ChatSession', 'ModuleProgress', 'UserSessionLog', 'LearningRoute']) {
      try { await db.execute({ sql: `DELETE FROM ${t} WHERE userId = ?`, args: [fila.id] }); } catch { /* tabla opcional */ }
    }
    await db.execute({ sql: 'DELETE FROM User WHERE id = ?', args: [fila.id] });
    console.log('✔ Usuario de prueba eliminado de dev.db.');
  }
} catch (e) {
  console.error('✘ Error inesperado:', e);
  console.log('Log del servidor:\n' + logServidor.slice(-2000));
} finally {
  server.kill();
}
process.exit(exitCode);
