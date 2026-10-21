/**
 * Re-sincronización y limpieza del Grafo de Conocimiento (Neo4j AuraDB).
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 * Los arreglos del 21/10/2026 (BUG 1, BUG 2, BUG 5) arreglaron el **código**,
 * pero las rutas que ya existían en la base nunca se re-sincronizaron:
 *
 *   - `Module` runtime con `CONTAINS_TOPIC` : 0   (debería ser > 0)
 *   - `Topic` con `COMPLETED`               : 0   (debería ser > 0)
 *   - `Topic` con `STRUGGLES_WITH`          : 0   (debería ser > 0)
 *   - `ENROLLED_IN`                         : 0   (debería ser > 0)
 *   - `Module` runtime huérfanos            : 75  (debería ser 0)
 *
 * Es decir: sin este script, los arreglos **no tienen ningún efecto
 * observable** en la instancia.
 *
 * ── Qué hace ─────────────────────────────────────────────────────────────────
 *   1. Recorre Turso (`LearningRoute` + `Module`) y reconstruye en el grafo
 *      los `Module` runtime con su arista `CONTAINS` a la ruta.
 *   2. Reconstruye la arista `CONTAINS_TOPIC` de cada módulo a partir de los
 *      temas curriculares que le tocan (por título, como respaldo).
 *   3. Crea `ENROLLED_IN` para las inscripciones existentes.
 *   4. Propaga `COMPLETED` desde `ModuleProgress`.
 *   5. Borra los `Module` runtime huérfanos (sin `CONTAINS` a ninguna ruta).
 *
 * ── Uso ──────────────────────────────────────────────────────────────────────
 *   node src/scripts/resync-graph.mjs                      → simulación
 *   node src/scripts/resync-graph.mjs --apply              → aplica
 *   node src/scripts/resync-graph.mjs --apply --clean-orphans
 *
 * ⚠️ El modo por defecto es **simulación**: imprime qué haría y no toca nada.
 */
import { turso } from '../config/turso.js';
import { getDriver, closeDriver } from '../services/neo4j.service.js';

const APPLY = process.argv.includes('--apply');
const CLEAN_ORPHANS = process.argv.includes('--clean-orphans');

const log = (icon, msg) => console.log(`${icon} ${msg}`);

/**
 * Ejecuta una escritura solo si estamos en modo `--apply`.
 * En simulación la cuenta lo que **se haría**, sin tocar el grafo.
 */
const aplicar = async (neoSession, cypher, params, contador) => {
  if (APPLY) {
    await neoSession.run(cypher, params);
  }
  contador.valor += 1;
};

const run = async () => {
  const driver = getDriver();
  if (!driver) {
    console.error('❌ Neo4j no configurado (NEO4J_URI / NEO4J_PASSWORD vacíos).');
    process.exit(1);
  }

  const neoSession = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  const modo = APPLY ? 'APLICANDO' : 'SIMULANDO (no se escribe nada)';
  console.log(`\n🔄 Re-sincronización del grafo — ${modo}\n${'─'.repeat(62)}`);

  try {
    // ── 1 · Estado actual ───────────────────────────────────────────────────
    const before = await neoSession.run(
      `MATCH (m:Module) WHERE m.id IS NULL
       WITH collect(m) AS mods
       RETURN size(mods) AS runtimeModules,
              size([x IN mods WHERE EXISTS { (x)<-[:CONTAINS]-() }]) AS linked`
    );
    const row = before.records[0];
    log('📊', `Módulos runtime: ${Number(row?.get('runtimeModules') ?? 0)} (enlazados a una ruta: ${Number(row?.get('linked') ?? 0)})`);

    const conTopics = await neoSession.run(
      `MATCH (m:Module)-[:CONTAINS_TOPIC]->(:Topic) RETURN count(DISTINCT m) AS modules`
    );
    log('📊', `Módulos runtime con CONTAINS_TOPIC: ${Number(conTopics.records[0]?.get('modules') ?? 0)}`);

    const completed = await neoSession.run(
      `MATCH (t:Topic)<-[:COMPLETED]-() RETURN count(DISTINCT t) AS topics`
    );
    log('📊', `Topics con COMPLETED: ${Number(completed.records[0]?.get('topics') ?? 0)}`);

    const enrolled = await neoSession.run(
      `MATCH ()-[:ENROLLED_IN]->() RETURN count(*) AS n`
    );
    log('📊', `Relaciones ENROLLED_IN: ${Number(enrolled.records[0]?.get('n') ?? 0)}`);

    // ── 2 · Datos de Turso ──────────────────────────────────────────────────
    const routesResult = await turso.execute(
      `SELECT id, title, category, subjectId FROM LearningRoute ORDER BY id ASC`
    );
    const modulesResult = await turso.execute(
      `SELECT id, title, routeId FROM Module ORDER BY routeId ASC, position ASC`
    );

    const modulesByRoute = new Map();
    for (const mod of modulesResult.rows) {
      if (!modulesByRoute.has(mod.routeId)) modulesByRoute.set(mod.routeId, []);
      modulesByRoute.get(mod.routeId).push(mod);
    }

    // ── 3 · Rutas y módulos en el grafo ─────────────────────────────────────
    const contModulos = { valor: 0 };
    const contTopics = { valor: 0 };
    const contEnrolled = { valor: 0 };
    const contCompletados = { valor: 0 };

    for (const route of routesResult.rows) {
      const routeId = String(route.id);
      const modules = modulesByRoute.get(route.id) || [];

      await aplicar(
        neoSession,
        `MERGE (r:LearningRoute {tursoId: $routeId})
         SET r.title = $title, r.category = $category, r.subjectId = $subjectId`,
        {
          routeId,
          title: route.title,
          category: route.category,
          subjectId: route.subjectId ?? null,
        },
        { valor: 0 }
      );

      for (const mod of modules) {
        await aplicar(
          neoSession,
          `MERGE (m:Module {title: $modTitle, routeId: $routeId})
           WITH m
           MATCH (r:LearningRoute {tursoId: $routeId})
           MERGE (r)-[:CONTAINS]->(m)`,
          { modTitle: mod.title, routeId },
          contModulos
        );

        // Temas del módulo: primero los que casan con un módulo curricular
        // (por título); si no hay, los cuyo nombre aparece en el título.
        let topics = await neoSession.run(
          `MATCH (cm:Module)-[:CONTAINS_TOPIC]->(ct:Topic)
           WHERE cm.id IS NOT NULL
             AND (cm.title = $modTitle OR cm.name = $modTitle OR $modTitle CONTAINS cm.name)
           RETURN DISTINCT ct.id AS id`,
          { modTitle: mod.title }
        );
        let topicIds = topics.records.map((r) => r.get('id'));

        if (topicIds.length === 0) {
          topics = await neoSession.run(
            `MATCH (cm:Module)-[:CONTAINS_TOPIC]->(ct:Topic)
             WHERE cm.id IS NOT NULL AND $modTitle CONTAINS ct.name
             RETURN DISTINCT ct.id AS id`,
            { modTitle: mod.title }
          );
          topicIds = topics.records.map((r) => r.get('id'));
        }

        for (const topicId of topicIds) {
          await aplicar(
            neoSession,
            `MATCH (m:Module {title: $modTitle, routeId: $routeId})
             MATCH (t:Topic {id: $topicId})
             MERGE (m)-[:CONTAINS_TOPIC]->(t)`,
            { modTitle: mod.title, routeId, topicId },
            contTopics
          );
        }
      }
    }

    log('🔗', `Módulos sincronizados: ${contModulos.valor} · enlaces CONTAINS_TOPIC: ${contTopics.valor}`);

    // ── 4 · ENROLLED_IN desde Turso ─────────────────────────────────────────
    const enrollments = await turso.execute(
      `SELECT DISTINCT e.userId, lr.subjectId
       FROM Enrollment e
       JOIN LearningRoute lr ON lr.id = e.learningRouteId
       WHERE lr.subjectId IS NOT NULL AND lr.subjectId <> ''`
    );

    for (const row of enrollments.rows) {
      await aplicar(
        neoSession,
        `MERGE (u:User {tursoId: $userId})
         MATCH (s:Subject {id: $subjectId})
         MERGE (u)-[:ENROLLED_IN]->(s)`,
        { userId: String(row.userId), subjectId: row.subjectId },
        contEnrolled
      );
    }
    log('🎓', `Relaciones ENROLLED_IN creadas: ${contEnrolled.valor}`);

    // ── 5 · COMPLETED desde ModuleProgress ─────────────────────────────────
    const progress = await turso.execute(
      `SELECT mp.userId, mp.isPassed, mp.score, m.title AS moduleTitle, m.routeId
       FROM ModuleProgress mp
       JOIN Module m ON m.id = mp.moduleId
       WHERE mp.isPassed = 1`
    );

    for (const row of progress.rows) {
      const routeId = String(row.routeId);

      await aplicar(
        neoSession,
        `MATCH (u:User {tursoId: $userId})
         MATCH (m:Module {title: $modTitle, routeId: $routeId})
         MERGE (u)-[c:COMPLETED]->(m)
         SET c.score = $score, c.date = datetime()`,
        { userId: String(row.userId), modTitle: row.moduleTitle, routeId, score: row.score ?? 100 },
        contCompletados
      );

      await aplicar(
        neoSession,
        `MATCH (u:User {tursoId: $userId})
         MATCH (m:Module {title: $modTitle, routeId: $routeId})-[:CONTAINS_TOPIC]->(t:Topic)
         MERGE (u)-[tc:COMPLETED]->(t)
         SET tc.score = $score, tc.date = datetime()`,
        { userId: String(row.userId), modTitle: row.moduleTitle, routeId, score: row.score ?? 100 },
        { valor: 0 }
      );
    }
    log('✅', `Módulos completados propagados: ${contCompletados.valor}`);

    // ── 6 · Limpieza de huérfanos ───────────────────────────────────────────
    const orphans = await neoSession.run(
      `MATCH (m:Module) WHERE m.id IS NULL AND NOT EXISTS { (m)<-[:CONTAINS]-() }
       RETURN m.title AS title, m.routeId AS routeId`
    );

    log('🧹', `Módulos runtime huérfanos: ${orphans.records.length}`);

    if (orphans.records.length > 0) {
      if (CLEAN_ORPHANS) {
        for (const orphan of orphans.records) {
          await neoSession.run(
            `MATCH (m:Module {title: $title, routeId: $routeId})
             DETACH DELETE m`,
            { title: orphan.get('title'), routeId: orphan.get('routeId') }
          );
        }
        log('🧹', `Huérfanos eliminados: ${orphans.records.length}`);
      } else {
        log('ℹ️', 'Para borrarlos añade --clean-orphans (revisa antes la lista).');
      }
    }

    // ── 7 · Estado final ────────────────────────────────────────────────────
    const after = await neoSession.run(
      `MATCH (m:Module) WHERE m.id IS NULL
       WITH collect(m) AS mods
       RETURN size(mods) AS runtimeModules,
              size([x IN mods WHERE EXISTS { (x)<-[:CONTAINS]-() }]) AS linked`
    );
    const afterRow = after.records[0];

    const topicsCompleted = await neoSession.run(
      `MATCH (t:Topic)<-[:COMPLETED]-() RETURN count(DISTINCT t) AS topics`
    );
    const topicsStruggle = await neoSession.run(
      `MATCH (t:Topic)<-[:STRUGGLES_WITH]-() RETURN count(DISTINCT t) AS topics`
    );
    const enrolledAfter = await neoSession.run(
      `MATCH ()-[:ENROLLED_IN]->() RETURN count(*) AS n`
    );

    console.log(`\n${'─'.repeat(62)}`);
    console.log('📊 Estado final del grafo:');
    console.log(`   Módulos runtime           : ${Number(afterRow?.get('runtimeModules') ?? 0)}`);
    console.log(`   ...enlazados a una ruta   : ${Number(afterRow?.get('linked') ?? 0)}`);
    console.log(`   Topics con COMPLETED      : ${Number(topicsCompleted.records[0]?.get('topics') ?? 0)}`);
    console.log(`   Topics con STRUGGLES_WITH : ${Number(topicsStruggle.records[0]?.get('topics') ?? 0)}`);
    console.log(`   Relaciones ENROLLED_IN    : ${Number(enrolledAfter.records[0]?.get('n') ?? 0)}`);

    console.log(
      APPLY
        ? '\n✅ Re-sincronización aplicada.'
        : '\n⚠️  Modo simulación: no se escribió nada. Usa --apply para aplicarlo.'
    );
    console.log('');
  } finally {
    await neoSession.close();
  }
};

try {
  await run();
} catch (error) {
  console.error('❌ Error en la re-sincronización:', error.message);
  process.exitCode = 1;
} finally {
  await closeDriver();
  await turso.close();
}
