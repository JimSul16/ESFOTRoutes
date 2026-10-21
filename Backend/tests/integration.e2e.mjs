/**
 * Prueba de integración real de punta a punta (Backend + Neo4j + Frontend API).
 *
 * Simula el recorrido completo de un estudiante:
 *   registro → login 2FA → autodiagnóstico → ruta adaptativa → completar
 *   módulo → recomendaciones → chat GraphRAG → analítica semanal.
 *
 * Verifica en cada paso el código de estado Y el efecto real en el grafo.
 */
import { createClient } from '@libsql/client';
import { getDriver, closeDriver } from '../src/services/neo4j.service.js';

const BASE = 'http://localhost:3000';
const db = createClient({ url: 'file:./dev.db' });

const ok = (n) => console.log(`  OK  ${n}`);
const mal = (n, d = '') => { console.log(`  FALLO  ${n} ${d}`); process.exitCode = 1; };
const seccion = (t) => console.log(`\n${'═'.repeat(66)}\n  ${t}\n${'═'.repeat(66)}`);

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
};

const graphQuery = async (cypher, params = {}) => {
  const driver = getDriver();
  const s = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  try {
    const r = await s.run(cypher, params);
    return r.records.map((x) => x.toObject());
  } finally {
    await s.close();
  }
};

const email = `integ.${Date.now()}@epn.edu.ec`;
const password = 'Prueba1234!';
let token = null;
let routeId = null;
let moduleId = null;
let moduleTitle = null;
let userId = null;
let topicIds = [];

try {
  // ── 1 · Registro ────────────────────────────────────────────────────────
  seccion('1 · REGISTRO');
  const reg = await call('POST', '/api/auth/register', { body: { name: 'Estudiante Integración', email, password } });
  if (reg.status === 201) ok(`registro 201 — ${reg.data.message}`);
  else mal(`registro: ${reg.status}`, JSON.stringify(reg.data));

  // Verificación de la cuenta (necesaria para poder iniciar sesión)
  const vtoken = (await db.execute('SELECT verificationToken FROM User WHERE email = ?', [email])).rows[0]?.verificationToken;
  if (vtoken) {
    const ver = await call('GET', `/api/auth/verify/${vtoken}`);
    if (ver.status === 200) ok('cuenta verificada 200');
    else mal(`verificación: ${ver.status}`);
  }

  // ── 2 · Login con 2FA ────────────────────────────────────────────────────
  seccion('2 · LOGIN CON 2FA');
  const l1 = await call('POST', '/api/auth/login', { body: { email, password } });
  if (l1.status === 206) ok('login paso 1 → 206 (pide OTP)');
  else mal(`login paso 1: ${l1.status}`, JSON.stringify(l1.data));

  const otp = (await db.execute('SELECT otpCode FROM User WHERE email = ?', [email])).rows[0]?.otpCode;
  const l2 = await call('POST', '/api/auth/login', { body: { email, password, otp } });
  if (l2.status === 200 && l2.data.token) {
    token = l2.data.token;
    ok('login paso 2 → 200 (token obtained)');
    userId = l2.data.user?.id;
  } else {
    mal(`login paso 2: ${l2.status}`, JSON.stringify(l2.data));
  }

  // ── 3 · Catálogo del grafo ───────────────────────────────────────────────
  seccion('3 · CATÁLOGO DEL GRAFO (lo que ve el autodiagnóstico)');
  const subjects = await call('GET', '/api/graph/subjects', { token });
  if (subjects.status === 200 && subjects.data.subjects.length > 0) {
    ok(`GET /graph/subjects → ${subjects.data.subjects.length} materias`);
    for (const s of subjects.data.subjects) {
      ok(`   ${s.id}: ${s.name} (${s.moduleCount} módulos, ${s.topicCount} temas)`);
    }
  } else mal(`subjects: ${subjects.status}`);

  const subjectId = subjects.data.subjects[0]?.id;
  const topics = await call('GET', `/api/graph/subjects/${subjectId}/topics`, { token });
  if (topics.status === 200 && topics.data.modules.length > 0) {
    ok(`GET /graph/subjects/${subjectId}/topics → ${topics.data.modules.length} módulos`);
    topicIds = topics.data.modules.flatMap((m) => m.topics.map((t) => t.id));
    ok(`   ${topicIds.length} temas con prerrequisitos`);
  } else mal(`topics: ${topics.status}`);

  // ── 4 · Autodiagnóstico ──────────────────────────────────────────────────
  seccion('4 · AUTODIAGNÓSTICO (HU-013)');
  const diagnoses = topicIds.map((id, i) => ({ topicId: id, level: (i % 5) + 1 }));
  const diag = await call('POST', '/api/graph/self-diagnosis', { token, body: { diagnoses } });
  if (diag.status === 200) ok(`POST /graph/self-diagnosis → 200 (${diag.data.savedCount} temas)`);
  else mal(`self-diagnosis: ${diag.status}`, JSON.stringify(diag.data));

  const selfLevels = await graphQuery(
    `MATCH (:User)-[sr:SELF_REPORTED]->(t:Topic) RETURN count(sr) AS n`
  );
  ok(`SELF_REPORTED en el grafo: ${Number(selfLevels[0]?.n?.low ?? 0)} relaciones`);

  // ── 5 · Ruta adaptativa (HU-014) ────────────────────────────────────────
  seccion('5 · RUTA ADAPTATIVA (HU-014) — orden topológico');
  const gen = await call('POST', '/api/graph/generate-personalized-route', { token, body: { subjectId } });
  if (gen.status === 201) {
    routeId = gen.data.routeId;
    ok(`POST /graph/generate-personalized-route → 201`);
    ok(`   ruta: "${gen.data.title}"`);
    ok(`   perfil: ${gen.data.summary?.profileType} · ${gen.data.summary?.totalTopics} temas · ${gen.data.totalEstimatedMinutes} min`);
    ok(`   módulos: ${gen.data.modules.length}`);
    for (const m of gen.data.modules) {
      const badges = m.topics.map((t) => t.badge).join(' | ');
      ok(`      ${m.title}`);
      ok(`         ${badges}`);
    }
  } else mal(`generate: ${gen.status}`, JSON.stringify(gen.data));

  // ── 6 · ¿Se creó la arista CONTAINS_TOPIC? (el BUG 1 arreglado) ─────────
  seccion('6 · EFECTO REAL EN EL GRAFO — BUG 1');
  const enlaces = await graphQuery(
    `MATCH (r:LearningRoute {tursoId: $rid})-[:CONTAINS]->(m:Module)-[:CONTAINS_TOPIC]->(t:Topic)
     RETURN count(DISTINCT m) AS modulos, count(DISTINCT t) AS temas`,
    { rid: String(routeId) }
  );
  const e = enlaces[0];
  const nModulos = Number(e?.modulos?.low ?? 0);
  const nTemas = Number(e?.temas?.low ?? 0);
  if (nModulos > 0) ok(`CONTAINS_TOPIC: ${nModulos} módulos enlazan con ${nTemas} temas curriculares`);
  else mal('CONTAINS_TOPIC = 0 → el BUG 1 sigue sin efecto');

  // ── 7 · Mis rutas / inscripción ──────────────────────────────────────────
  seccion('7 · MIS RUTAS');
  const mine = await call('GET', '/api/routes/my-routes', { token });
  if (mine.status === 200) {
    const r = mine.data.find((x) => String(x.id) === String(routeId));
    ok(`GET /routes/my-routes → ${mine.data.length} rutas`);
    if (r) {
      ok(`   ruta ${r.id}: progreso ${r.progress}% · ${r.modules.length} módulos · isPassed=${r.modules[0]?.isPassed}`);
      moduleId = r.modules[0]?.id;
      moduleTitle = r.modules[0]?.title;
    }
  } else mal(`my-routes: ${mine.status}`);

  const enrolled = await graphQuery(
    `MATCH (:User)-[:ENROLLED_IN]->(:Subject) RETURN count(*) AS n`
  );
  ok(`ENROLLED_IN en el grafo: ${Number(enrolled[0]?.n?.low ?? 0)}`);

  // ── 8 · Completar un módulo ──────────────────────────────────────────────
  seccion('8 · COMPLETAR MÓDULO → COMPLETED en el Topic (BUG 1)');
  const before = await graphQuery(
    `MATCH (t:Topic)<-[:COMPLETED]-(:User {tursoId: $uid}) RETURN count(DISTINCT t) AS n`,
    { uid: String(userId) }
  );
  const beforeN = Number(before[0]?.n?.low ?? 0);

  const cm = await call('POST', '/api/routes/complete-module', {
    token, body: { moduleId, score: 95, passed: true },
  });
  if (cm.status === 200) {
    ok(`POST /routes/complete-module → 200 (+${cm.data.xpGained ?? 0} XP, nivel ${cm.data.newLevel})`);
  } else mal(`complete-module: ${cm.status}`, JSON.stringify(cm.data));

  // Se comprueba el usuario de esta prueba (no el total del grafo): el nodo
  // `User` de Neo4j sobrevive al borrado del usuario en Turso, así que el
  // conteo global puede venir de pruebas anteriores.
  const after = await graphQuery(
    `MATCH (t:Topic)<-[:COMPLETED]-(:User {tursoId: $uid}) RETURN count(DISTINCT t) AS n`,
    { uid: String(userId) }
  );
  const afterN = Number(after[0]?.n?.low ?? 0);
  if (afterN > beforeN) ok(`COMPLETED → Topic de este usuario: ${beforeN} → ${afterN} ✅`);
  else mal(`COMPLETED → Topic no cambió (${beforeN} → ${afterN})`);

  // Y que el módulo completado está enlazado con los topics curriculares.
  const enlacesModulo = await graphQuery(
    `MATCH (m:Module {title: $title, routeId: $rid})-[:CONTAINS_TOPIC]->(t:Topic)<-[:COMPLETED]-(:User {tursoId: $uid})
     RETURN count(DISTINCT t) AS n`,
    { title: moduleTitle, rid: String(routeId), uid: String(userId) }
  );
  const nEnlazados = Number(enlacesModulo[0]?.n?.low ?? 0);
  if (nEnlazados > 0) ok(`${nEnlazados} topics del módulo completados tienen COMPLETED ✅`);
  else mal('el módulo completado no propaga COMPLETED a sus topics');

  // ── 9 · Recomendaciones cruzadas (BUG 3) ────────────────────────────────
  seccion('9 · RECOMENDACIONES CRUZADAS (BUG 3 — escala del matchScore)');
  const recs = await call('GET', '/api/graph/recommendations', { token });
  if (recs.status === 200) {
    const r = recs.data.recommendations;
    ok(`GET /graph/recommendations → ${r.length} recomendaciones`);
    for (const x of r) ok(`   ${x.name}: ${x.matchScore}% de afinidad`);
    if (r.length > 0 && r[0].matchScore > 1) ok('   ✅ el score viene en escala 0-100');
    else if (r.length > 0) mal(`   matchScore = ${r[0].matchScore} (debería ser 0-100)`);
    else mal('   0 recomendaciones (¿hay Topics con COMPLETED?)');
  } else mal(`recommendations: ${recs.status}`);

  // ── 10 · Chat GraphRAG (BUG 4) ──────────────────────────────────────────
  seccion('10 · CHAT CON GRAPH RAG (BUG 4)');
  const moduleTopics = await call('GET', `/api/graph/module/${moduleId}/topics`, { token });
  if (moduleTopics.status === 200) {
    ok(`GET /graph/module/${moduleId}/topics → ${moduleTopics.data.topics.length} temas`);
    if (moduleTopics.data.topics[0]) ok(`   primero: ${moduleTopics.data.topics[0].name}`);
  } else mal(`module topics: ${moduleTopics.status}`);

  const chat = await call('POST', '/api/chat/send', {
    token, body: { message: '¿Me puedes explicar este concepto?', moduleId, topicId: moduleTopics.data.topics?.[0]?.id },
  });
  if (chat.status === 200) {
    ok('POST /chat/send → 200');
    ok(`   sessionId: ${chat.data.sessionId}`);
    ok(`   respuesta: "${String(chat.data.reply.content).slice(0, 90).replace(/\n/g, ' ')}..."`);
  } else mal(`chat: ${chat.status}`, JSON.stringify(chat.data));

  const topicCtx = await call('GET', `/api/graph/topic/${moduleTopics.data.topics?.[0]?.id}/context`, { token });
  if (topicCtx.status === 200) {
    const c = topicCtx.data.context;
    ok(`GET /graph/topic/:id/context → "${c.name}" (prerrequisitos: ${c.prerequisites.length}, desbloquea: ${c.unlocks.length})`);
  } else mal(`topic context: ${topicCtx.status}`);

  // ── 11 · Analítica semanal (BUG 10) ─────────────────────────────────────
  seccion('11 · ANALÍTICA SEMANAL (BUG 10 — datos reales)');
  const analytics = await call('GET', '/api/analytics/weekly-activity', { token });
  if (analytics.status === 200) {
    const w = analytics.data.weeklyActivity;
    ok(`GET /analytics/weekly-activity → ${w.length} días`);
    for (const d of w) ok(`   ${d.day}: ${d.minutes} min (${d.completedModules} módulos)`);
    ok(`   total: ${analytics.data.totalMinutes} min`);
  } else mal(`analytics: ${analytics.status}`);

  // ── 12 · Casos límite ────────────────────────────────────────────────────
  seccion('12 · CASOS LÍMITE (los que antes daban 500)');
  const casos = [
    // Ojo: `DELETE /routes/:id` es solo ADMIN, así que un STUDENT recibe 403
    // (el rol se comprueba antes que el id). Con un token de admin, el id no
    // numérico debe dar 400 y no 500.
    ['DELETE /routes/abc (STUDENT → 403 por rol)', 'DELETE', '/api/routes/abc', 403],
    ['POST /routes/999999/enroll', 'POST', '/api/routes/999999/enroll', 404],
    ['POST /chat/send sessionId="abc"', 'POST', '/api/chat/send', 400],
    ['POST /chat/assessment moduleId=999999', 'POST', '/api/chat/assessment', 404],
  ];
  for (const [nombre, metodo, path, esperado] of casos) {
    const body = path.includes('chat/send')
      ? { message: 'x', sessionId: 'abc' }
      : path.includes('assessment')
      ? { moduleId: 999999 }
      : undefined;
    const r = await call(metodo, path, { token, body });
    if (r.status === esperado) ok(`${nombre} → ${r.status} ✅`);
    else mal(`${nombre} → ${r.status} (esperado ${esperado})`);
  }

  // El id no numérico con un token de ADMIN: 400 y no 500.
  const admin = (await db.execute(
    `SELECT u.id FROM User u JOIN UserRole ur ON ur.userId = u.id JOIN Role r ON r.id = ur.roleId
     WHERE r.name = 'ADMIN' LIMIT 1`
  )).rows[0];
  if (admin) {
    const { default: jwt } = await import('jsonwebtoken');
    const roles = (await db.execute(
      `SELECT r.name FROM Role r JOIN UserRole ur ON ur.roleId = r.id WHERE ur.userId = ?`,
      [admin.id]
    )).rows.map((r) => r.name);
    const adminToken = jwt.sign({ id: admin.id, roles }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const r = await call('DELETE', '/api/routes/abc', { token: adminToken });
    if (r.status === 400) ok(`DELETE /routes/abc (ADMIN, id no numérico) → 400 ✅`);
    else mal(`DELETE /routes/abc (ADMIN) → ${r.status} (esperado 400)`);
  }
} catch (error) {
  console.error('\n💥 Excepción en la prueba de integración:', error.message);
  process.exitCode = 1;
} finally {
  // Limpieza: borrar el usuario de prueba
  try {
    const u = (await db.execute('SELECT id FROM User WHERE email = ?', [email])).rows[0];
    if (u) {
      await db.execute('DELETE FROM ChatMessage WHERE sessionId IN (SELECT id FROM ChatSession WHERE userId = ?)', [u.id]);
      await db.execute('DELETE FROM ChatSession WHERE userId = ?', [u.id]);
      await db.execute('DELETE FROM Enrollment WHERE userId = ?', [u.id]);
      await db.execute('DELETE FROM ModuleProgress WHERE userId = ?', [u.id]);
      await db.execute('DELETE FROM ModuleAssessment WHERE moduleId IN (SELECT id FROM Module WHERE routeId IN (SELECT id FROM LearningRoute WHERE authorId = ?))', [u.id]);
      await db.execute('DELETE FROM Module WHERE routeId IN (SELECT id FROM LearningRoute WHERE authorId = ?)', [u.id]);
      await db.execute('DELETE FROM LearningRoute WHERE authorId = ?', [u.id]);
      await db.execute('DELETE FROM UserRole WHERE userId = ?', [u.id]);
      await db.execute('DELETE FROM User WHERE id = ?', [u.id]);
      console.log('\n🧹 Usuario de prueba eliminado (Turso).');
    }

    // El nodo `User` de Neo4j sobrevive al borrado del usuario en Turso: si
    // no se limpia, la prueba no es idempotente (las relaciones COMPLETED de
    // la ejecución anterior siguen ahí).
    if (userId) {
      try {
        const driver = getDriver();
        if (driver) {
          const s = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
          await s.run('MATCH (u:User {tursoId: $uid}) DETACH DELETE u', { uid: String(userId) });
          await s.close();
          console.log('🧹 Nodo User de prueba eliminado (Neo4j).');
        }
      } catch {
        // La limpieza del grafo es best-effort: no debe enmascarar el resultado.
      }
    }
  } catch (e) {
    console.log('⚠️  No se pudo limpiar el usuario de prueba:', e.message);
  }
  await closeDriver();
  await db.close();
  console.log(process.exitCode ? '\n❌ HAY FALLOS\n' : '\n✅ TODAS LAS COMPROBACIONES PASARON\n');
}
