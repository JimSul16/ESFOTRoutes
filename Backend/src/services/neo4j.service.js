import neo4j from 'neo4j-driver';
import "dotenv/config";

// ── Driver singleton ────────────────────────────────────────────────────────
let _driver = null;

export const getDriver = () => {
  if (!_driver) {
    const uri      = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      console.warn('⚠️  Neo4j no configurado (NEO4J_URI / NEO4J_PASSWORD vacíos). El grafo estará desactivado.');
      return null;
    }

    _driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return _driver;
};

/**
 * Cierra el driver de Neo4j.
 *
 * Sin esto, los sockets del driver quedaban abiertos: en la suite de Jest
 * el proceso no podía salir solo ("A worker process has failed to exit
 * gracefully") y `--detectOpenHandles` se colgaba más de 10 minutos.
 * También hace falta un cierre ordenado en producción (SIGTERM/SIGINT).
 *
 * @returns {Promise<void>}
 */
export const closeDriver = async () => {
  if (!_driver) return;
  try {
    await _driver.close();
  } catch (err) {
    console.warn('⚠️  Error cerrando el driver de Neo4j:', err.message);
  } finally {
    _driver = null;
  }
};

const getSession = (driver) => {
  const database = process.env.NEO4J_DATABASE || 'neo4j';
  return driver.session({ database });
};

// ── Verificar Conexión con Neo4j ───────────────────────────────────────────
export const verifyNeo4jConnection = async () => {
  const driver = getDriver();
  if (!driver) return false;

  try {
    const serverInfo = await driver.getServerInfo();
    console.log(`✅ Conectado a Neo4j AuraDB (${serverInfo.agent || serverInfo.address})`);
    return true;
  } catch (error) {
    console.warn(`⚠️  No se pudo conectar a Neo4j AuraDB aún: ${error.message}`);
    return false;
  }
};

// ── Sincronizar una Ruta de Aprendizaje al Grafo ───────────────────────────
/**
 * @param {string|number} routeId   Id de la ruta en Turso.
 * @param {string} title            Título de la ruta.
 * @param {string} category         Categoría/materia de la ruta.
 * @param {Array<{title: string, topicIds?: string[]}>} modules
 *        Módulos de la ruta. `topicIds` son los ids curriculares (`Topic.id`)
 *        que el módulo cubre: se usan para crear la arista `CONTAINS_TOPIC`.
 */
export const syncRouteToGraph = async (routeId, title, category, modules = []) => {
  const driver = getDriver();
  if (!driver) return;

  const session = getSession(driver);
  try {
    // Nodo de la ruta
    await session.run(
      `MERGE (r:LearningRoute {tursoId: $routeId})
       SET r.title = $title, r.category = $category`,
      { routeId: routeId.toString(), title, category: category || 'General' }
    );

    // Nodos de módulos y relación CONTAINS
    for (const mod of modules) {
      await session.run(
        `MERGE (m:Module {title: $modTitle, routeId: $routeId})
         WITH m
         MATCH (r:LearningRoute {tursoId: $routeId})
         MERGE (r)-[:CONTAINS]->(m)`,
        { modTitle: mod.title, routeId: routeId.toString() }
      );

      // ── BUG 1: el `Module` runtime debe apuntar a sus `Topic` curriculares.
      // Sin esta arista, `markModuleAsCompleted` y `markModuleStruggle` no
      // encontraban ningún `Topic` (los `Module` runtime se creaban solo con
      // `{title, routeId}`), así que `COMPLETED` / `STRUGGLES_WITH` nunca
      // llegaban al grafo curricular: el refuerzo adaptativo nunca se activaba,
      // `isCompleted` era siempre `false` y las recomendaciones salían vacías.
      const topicIds = Array.isArray(mod.topicIds) ? mod.topicIds.filter(Boolean) : [];

      for (const topicId of topicIds) {
        await session.run(
          `MATCH (m:Module {title: $modTitle, routeId: $routeId})
           MATCH (t:Topic {id: $topicId})
           MERGE (m)-[:CONTAINS_TOPIC]->(t)`,
          { modTitle: mod.title, routeId: routeId.toString(), topicId: String(topicId) }
        );
      }
    }
  } catch (err) {
    console.error('⚠️  Error sincronizando con Neo4j:', err.message);
  } finally {
    await session.close();
  }
};

// ── Eliminar ruta del grafo ────────────────────────────────────────────────
export const deleteRouteFromGraph = async (routeId) => {
  const driver = getDriver();
  if (!driver) return;

  const session = getSession(driver);
  try {
    // 1) Los `Module` runtime de la ruta se borran con ella.
    //    `DETACH DELETE r` solo eliminaba la ruta y sus aristas `CONTAINS`:
    //    los módulos quedaban sueltos (huérfanos) y el grafo se ensuciaba en
    //    cada borrado (medido: 48 → 64 huérfanos tras borrar 3 rutas).
    await session.run(
      `MATCH (m:Module {routeId: $routeId})
       DETACH DELETE m`,
      { routeId: routeId.toString() }
    );

    // 2) La ruta y sus aristas.
    await session.run(
      `MATCH (r:LearningRoute {tursoId: $routeId})
       DETACH DELETE r`,
      { routeId: routeId.toString() }
    );
  } catch (err) {
    console.error('⚠️  Error eliminando ruta del grafo:', err.message);
  } finally {
    await session.close();
  }
};

// ── Marcar un módulo como completado por el usuario en el Grafo ─────────────
export const markModuleAsCompleted = async (userId, routeId, moduleTitle, score) => {
  const driver = getDriver();
  if (!driver) return;

  const session = getSession(driver);
  const params = {
    userId: userId.toString(),
    modTitle: moduleTitle,
    routeId: routeId.toString(),
    score: score || 100
  };

  try {
    // 1) Progreso sobre el `Module` runtime de la ruta.
    await session.run(
      `MERGE (u:User {tursoId: $userId})
       MERGE (m:Module {title: $modTitle, routeId: $routeId})
       MERGE (u)-[c:COMPLETED]->(m)
       SET c.score = $score, c.date = datetime()
       WITH u, m
       OPTIONAL MATCH (r:LearningRoute {tursoId: $routeId})
       FOREACH (_ IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
         MERGE (r)-[:CONTAINS]->(m)
       )`,
      params
    );

    // 2) Progreso sobre los `Topic` curriculares que cubre ese módulo.
    //    Esta es la relación que consumía el resto del sistema (refuerzo
    //    adaptativo, `isCompleted` y recomendaciones cruzadas).
    await session.run(
      `MATCH (u:User {tursoId: $userId})
       MATCH (m:Module {title: $modTitle, routeId: $routeId})-[:CONTAINS_TOPIC]->(t:Topic)
       MERGE (u)-[tc:COMPLETED]->(t)
       SET tc.score = $score, tc.date = datetime()`,
      params
    );

    // 2.b) Respaldo para los módulos que NO vienen del grafo curricular (los
    //      que crea el panel de admin o el generador por IA): no tienen
    //      arista `CONTAINS_TOPIC`, pero si su título coincide con un módulo
    //      curricular se enlazan igual. Los módulos curriculares son los que
    //      tienen `id`; los runtime se identifican por `{title, routeId}`.
    await session.run(
      `MATCH (u:User {tursoId: $userId})
       MATCH (cm:Module)-[:CONTAINS_TOPIC]->(ct:Topic)
       WHERE cm.id IS NOT NULL
         AND (cm.title = $modTitle OR cm.name = $modTitle OR $modTitle CONTAINS cm.name)
       MERGE (u)-[tc2:COMPLETED]->(ct)
       SET tc2.score = $score, tc2.date = datetime()`,
      params
    );

    // 3) Aprobar el módulo borra la dificultad previa (módulo y temas).
    await session.run(
      `MATCH (u:User {tursoId: $userId})
       MATCH (m:Module {title: $modTitle, routeId: $routeId})
       OPTIONAL MATCH (u)-[sw:STRUGGLES_WITH]->(m)
       DELETE sw
       WITH u, m
       OPTIONAL MATCH (m)-[:CONTAINS_TOPIC]->(t:Topic)
       OPTIONAL MATCH (u)-[tsw:STRUGGLES_WITH]->(t)
       DELETE tsw`,
      params
    );

    console.log(`✅ Neo4j: Usuario ${userId} completó el módulo '${moduleTitle}'`);
  } catch (err) {
    console.error('❌ Error guardando progreso en Neo4j:', err.message);
  } finally {
    await session.close();
  }
};

// ── Registrar dificultad con un módulo en el Grafo (Telemetría de Examen) ───
export const markModuleStruggle = async (userId, routeId, moduleTitle, score, reason = 'Reprobó examen de módulo') => {
  const driver = getDriver();
  if (!driver) return;

  const session = getSession(driver);
  const params = {
    userId: userId.toString(),
    modTitle: moduleTitle,
    routeId: routeId.toString(),
    score: score || 0,
    reason: `${reason} (${score || 0}%)`
  };

  try {
    // 1) Dificultad sobre el `Module` runtime de la ruta.
    await session.run(
      `MERGE (u:User {tursoId: $userId})
       MERGE (m:Module {title: $modTitle, routeId: $routeId})
       MERGE (u)-[sw:STRUGGLES_WITH]->(m)
       SET sw.score = $score, sw.reason = $reason, sw.date = datetime()
       WITH u, m
       OPTIONAL MATCH (r:LearningRoute {tursoId: $routeId})
       FOREACH (_ IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
         MERGE (r)-[:CONTAINS]->(m)
       )`,
      params
    );

    // 2) Dificultad sobre los `Topic` curriculares que cubre ese módulo.
    //    Es lo que dispara el "⚡ Refuerzo Sugerido" de la ruta adaptativa
    //    (`strugglesBonus` en graphAlgorithm.js).
    await session.run(
      `MATCH (u:User {tursoId: $userId})
       MATCH (m:Module {title: $modTitle, routeId: $routeId})-[:CONTAINS_TOPIC]->(t:Topic)
       MERGE (u)-[tsw:STRUGGLES_WITH]->(t)
       SET tsw.score = $score, tsw.reason = $reason, tsw.date = datetime()`,
      params
    );

    // 2.b) Respaldo por nombre para los módulos que no vienen del grafo
    //      curricular (panel de admin o generación por IA).
    await session.run(
      `MATCH (u:User {tursoId: $userId})
       MATCH (cm:Module)-[:CONTAINS_TOPIC]->(ct:Topic)
       WHERE cm.id IS NOT NULL
         AND (cm.title = $modTitle OR cm.name = $modTitle OR $modTitle CONTAINS cm.name)
       MERGE (u)-[tsw2:STRUGGLES_WITH]->(ct)
       SET tsw2.score = $score, tsw2.reason = $reason, tsw2.date = datetime()`,
      params
    );

    console.log(`⚠️  Neo4j: Registrada dificultad para usuario ${userId} en módulo '${moduleTitle}'`);
  } catch (err) {
    console.error('❌ Error registrando dificultad en Neo4j:', err.message);
  } finally {
    await session.close();
  }
};
