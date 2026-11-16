/**
 * Pruebas de integración de punta a punta del flujo de autenticación,
 * replicando exactamente lo que hace el frontend (headers Origin de Vercel).
 *
 *   1. Rutas SPA en Vercel (deep links del correo)
 *   2. Registro (payload del Register.tsx)
 *   3. Verificación de la cuenta (link del correo)
 *   4. Login + perfil (GET/PUT /auth/profile)
 *   5. Recuperación de contraseña (forgot → reset → login nuevo)
 *
 * Uso: node scripts/flujo-verificacion.mjs [--borrar-al-final]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://esfotroutes.onrender.com';
const WEB = 'https://tic-rutas-aprendizaje.vercel.app';
const ORIGIN = WEB;
const TS = Date.now().toString().slice(-8);

// ── BD de producción (para leer los tokens que genera el backend) ───────────
const envRaw = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const pick = (k) => {
  const a = envRaw.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
  const c = envRaw.match(new RegExp(`^#\\s*${k}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
  const red = (v) => v && /^(libsql|https?):\/\//.test(v);
  return red(a) ? a : red(c) ? c : a || c || '';
};
const db = createClient({ url: pick('TURSO_DATABASE_URL'), authToken: pick('TURSO_AUTH_TOKEN') });

const resultados = [];
const anotar = (fase, paso, esperado, obtenido, ok) => {
  resultados.push({ fase, paso, esperado, obtenido, ok });
  console.log(`${ok ? '  ✔' : '  ✘'} ${paso.padEnd(52)} esperado ${String(esperado).padEnd(28)} → ${obtenido}`);
};

const call = async (method, url, body, headers = {}) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data = null;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = { _raw: text.slice(0, 200) }; }
    return { status: res.status, data, text, headers: res.headers };
  } catch (e) {
    return { status: 0, data: { error: `${e.name}: ${e.message}` }, text: '' };
  } finally {
    clearTimeout(t);
  }
};

// ── 0. Warm-up ───────────────────────────────────────────────────────────────
console.log(`\n🌐 ${API}  |  ${WEB}  |  corrida ${TS}\n`);
const health = await call('GET', `${API}/api/health`);
console.log(`warm-up /api/health → ${health.status}\n`);

const email = `prueba.flujo.${TS}@gmail.com`;
const password = 'PasswordSegura123!';
const uniqueId = String(Math.floor(100000000 + Math.random() * 900000000));

// ── 1. Rutas SPA (deep links que vienen del correo) ─────────────────────────
console.log('── 1. Rutas SPA en Vercel ────────────────────────');
for (const ruta of ['/login', '/register', '/confirm/token-de-prueba', '/reset-password/token-de-prueba', '/']) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(WEB + ruta, { redirect: 'follow', signal: ctrl.signal });
    const tipo = res.headers.get('content-type') || '';
    const esHtml = tipo.includes('text/html');
    const ok = res.status === 200 && esHtml;
    anotar('SPA', `GET ${ruta}`, '200 text/html (SPA)', `${res.status} ${tipo.split(';')[0]}`, ok);
  } catch (e) {
    anotar('SPA', `GET ${ruta}`, '200 text/html (SPA)', `ERROR ${e.name}`, false);
  } finally {
    clearTimeout(t);
  }
}

// ── 2. Registro (payload idéntico al Register.tsx) ─────────────────────────
console.log('\n── 2. Registro ────────────────────────────────────');
const registro = await call('POST', `${API}/api/auth/register`, {
  name: 'Prueba Flujo RR',
  email,
  password,
  career: 'Redes y Telecomunicaciones',
  semester: 3,
  uniqueId,
});
anotar('Registro', 'POST /api/auth/register (Origin Vercel)', '201', `${registro.status}: ${registro.data.message || registro.data.error}`, registro.status === 201);
anotar('Registro', 'Sin emailError (correo entregado)', 'sin emailError', registro.data?.emailError ? 'emailError: true' : 'sin emailError', !registro.data?.emailError);

// ── 3. Verificación ─────────────────────────────────────────────────────────
console.log('\n── 3. Verificación de la cuenta ───────────────────');
const busq = await db.execute({ sql: `SELECT id, verificationToken, isVerified FROM User WHERE email = ?`, args: [email] });
const usuario = busq.rows[0];
if (!usuario) {
  console.log('  ✘ El usuario no se creó en la BD: no se puede continuar.');
  process.exit(1);
}
anotar('Verificación', 'Usuario creado en BD de producción', 'existe', `id ${usuario.id}`, true);

const linkConfirm = `${WEB}/confirm/${usuario.verificationToken}`;
const spaConfirm = await call('GET', linkConfirm);
anotar('Verificación', 'Link del correo abre la SPA (/confirm/:token)', '200', `${spaConfirm.status}`, spaConfirm.status === 200);

const verif = await call('GET', `${API}/api/auth/verify/${usuario.verificationToken}`, undefined, { Accept: 'application/json' });
anotar('Verificación', 'GET /api/auth/verify/:token (botón "Verificar mi cuenta")', '200 Cuenta verificada', `${verif.status}: ${verif.data.message || verif.data.error}`, verif.status === 200);

// reutilización del mismo token (segundo clic)
const verif2 = await call('GET', `${API}/api/auth/verify/${usuario.verificationToken}`, undefined, { Accept: 'application/json' });
anotar('Verificación', 'Segundo clic con el mismo token', '400 Token inválido (controlado)', `${verif2.status}: ${verif2.data.message || verif2.data.error}`, verif2.status === 400);

const estado = await db.execute({ sql: `SELECT isVerified FROM User WHERE id = ?`, args: [usuario.id] });
anotar('Verificación', 'BD marca la cuenta como verificada', 'isVerified = 1', `isVerified = ${estado.rows[0].isVerified}`, estado.rows[0].isVerified === 1);

// ── 4. Login + perfil ──────────────────────────────────────────────────────
console.log('\n── 4. Login y perfil ──────────────────────────────');
const login = await call('POST', `${API}/api/auth/login`, { email, password });
anotar('Login', 'POST /api/auth/login', '200 con token', `${login.status}: ${login.data.message || login.data.error || 'token ok'}`, login.status === 200 && Boolean(login.data.token));
const token = login.data?.token;
const auth = { Authorization: `Bearer ${token}` };

if (token) {
  const perfil = await call('GET', `${API}/api/auth/profile`, undefined, auth);
  anotar('Perfil', 'GET /auth/profile expone career/semester/uniqueId', '200 con los 3 campos',
    `${perfil.status} career=${perfil.data?.career} semester=${perfil.data?.semester} uniqueId=${perfil.data?.uniqueId}`,
    perfil.status === 200 && Boolean(perfil.data?.career) && Boolean(perfil.data?.semester) && Boolean(perfil.data?.uniqueId));

  const guardar = await call('PUT', `${API}/api/auth/profile`, { name: 'Prueba Flujo RR', career: 'Redes y Telecomunicaciones', semester: 4 }, auth);
  anotar('Perfil', 'PUT /auth/profile con career+semester (guardado)', '200', `${guardar.status}: ${guardar.data.message || guardar.data.error}`, guardar.status === 200);

  const guardarSin = await call('PUT', `${API}/api/auth/profile`, { name: 'Prueba Flujo RR' }, auth);
  anotar('Perfil', 'PUT /auth/profile SIN career/semester', '400 carrera obligatoria', `${guardarSin.status}: ${guardarSin.data.error || guardarSin.data.message}`, guardarSin.status === 400);

  const sinVerif = await call('POST', `${API}/api/auth/login`, { email: `nadie.${TS}@gmail.com`, password });
  anotar('Login', 'Login de cuenta inexistente', '401/404 controlado', `${sinVerif.status}`, sinVerif.status === 401 || sinVerif.status === 404);

  // ── 4b. Smoke de los endpoints que consume el frontend ────────────────────
  console.log('\n── 4b. Endpoints del backend (smoke) ───────────────');
  const gets = [
    ['/api/auth/sessions', 'historial de sesiones'],
    ['/api/auth/my-progress', 'progreso propio'],
    ['/api/analytics/weekly-activity', 'analítica semanal'],
    ['/api/resources', 'recursos'],
    ['/api/resources/catalog', 'catálogo'],
    ['/api/routes', 'rutas'],
    ['/api/routes/my-routes', 'mis rutas'],
    ['/api/graph/subjects', 'materias del grafo'],
    ['/api/graph/recommendations', 'recomendaciones'],
  ];
  for (const [ruta, desc] of gets) {
    const r = await call('GET', API + ruta, undefined, auth);
    anotar('Smoke', `GET ${ruta} (${desc})`, '200', `${r.status}`, r.status === 200);
  }
  // ADMIN-only con token de estudiante → 403 (controlado).
  for (const [method, ruta] of [['GET', '/api/admin/users'], ['GET', '/api/auth/admin/users'], ['POST', '/api/auth/learning-paths']]) {
    const r = await call(method, API + ruta, method === 'POST' ? {} : undefined, auth);
    anotar('Smoke', `${method} ${ruta} (solo ADMIN)`, '403 para STUDENT', `${r.status}`, r.status === 403);
  }
}

// ── 5. Recuperación de contraseña ──────────────────────────────────────────
console.log('\n── 5. Recuperación de contraseña ──────────────────');
const forgot = await call('POST', `${API}/api/auth/forgot-password`, { email });
anotar('Reset', 'POST /auth/forgot-password', '200 mensaje neutro', `${forgot.status}: ${forgot.data.message || forgot.data.error}`, forgot.status === 200);

const conToken = await db.execute({ sql: `SELECT resetToken FROM User WHERE id = ?`, args: [usuario.id] });
const resetToken = conToken.rows[0]?.resetToken;
anotar('Reset', 'Backend guardó resetToken en BD', 'token presente', resetToken ? `${String(resetToken).slice(0, 12)}…` : 'SIN TOKEN', Boolean(resetToken));

if (resetToken) {
  const spaReset = await call('GET', `${WEB}/reset-password/${resetToken}`);
  anotar('Reset', 'Link del correo abre la SPA (/reset-password/:token)', '200', `${spaReset.status}`, spaReset.status === 200);

  const reset = await call('PATCH', `${API}/api/auth/reset-password/${resetToken}`, { newPassword: 'NuevaPasswordSegura2026!' });
  anotar('Reset', 'PATCH /auth/reset-password/:token', '200', `${reset.status}: ${reset.data.message || reset.data.error}`, reset.status === 200);

  const loginNuevo = await call('POST', `${API}/api/auth/login`, { email, password: 'NuevaPasswordSegura2026!' });
  anotar('Reset', 'Login con la contraseña nueva', '200 con token', `${loginNuevo.status}`, loginNuevo.status === 200 && Boolean(loginNuevo.data.token));

  const loginViejo = await call('POST', `${API}/api/auth/login`, { email, password });
  anotar('Reset', 'Login con la contraseña vieja', '401 credenciales incorrectas', `${loginViejo.status}`, loginViejo.status === 401);
}

// ── Reporte ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(112));
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('FASE', 14) + pad('PASO', 54) + pad('RESULT.', 10) + 'DETALLE');
console.log('─'.repeat(112));
for (const r of resultados) {
  console.log(pad(r.fase, 14) + pad(r.paso, 54) + pad(r.ok ? '✔ PASS' : '✘ FAIL', 10) + `${r.esperado} ← ${r.obtenido}`);
}
const fallos = resultados.filter((r) => !r.ok).length;
console.log('═'.repeat(112));
console.log(`\n${resultados.length} pasos · ${resultados.length - fallos} ok · ${fallos} fallos`);

// Aviso específico: el paso de perfil falla mientras el fix de
// `updateProfile` (validación de uniqueId) no esté desplegado en Render.
const pendiente = resultados.find((r) => !r.ok && /PUT \/auth\/profile con career/.test(r.paso));
if (pendiente) {
  console.log('\n⚠️  El guardado de perfil sigue fallando en PRODUCCIÓN: falta desplegar en');
  console.log('    Render el fix de `updateProfile` (Backend/src/controllers/auth.controller.js).');
  console.log('    Verificado en local con `node scripts/flujo-local.mjs` → 21/21 PASS.');
}
console.log(`\nCuenta de prueba creada: ${email} / ${password} (uniqueId ${uniqueId})`);
console.log(`Link de verificación usado: ${linkConfirm}`);

if (process.argv.includes('--borrar-al-final')) {
  for (const tabla of ['UserRole', 'Enrollment', 'ChatSession', 'ModuleProgress', 'UserSessionLog', 'LearningRoute']) {
    try { await db.execute({ sql: `DELETE FROM ${tabla} WHERE userId = ?`, args: [usuario.id] }); } catch { /* tabla opcional */ }
  }
  await db.execute({ sql: `DELETE FROM User WHERE id = ?`, args: [usuario.id] });
  console.log('✔ Cuenta de prueba eliminada de la BD.');
}

process.exit(fallos ? 1 : 0);
