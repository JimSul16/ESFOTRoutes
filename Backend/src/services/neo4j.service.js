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
    }
  } catch (err) {
    console.error('⚠️  Error sincronizando con Neo4j:', err.message);
  } finally {
    await session.close();
  }
};

// ── Obtener recomendaciones basadas en rutas completadas ──────────────────
export const getRecommendations = async (completedRouteIds = []) => {
  const driver = getDriver();
  if (!driver || completedRouteIds.length === 0) return [];

  const session = getSession(driver);
  try {
    const result = await session.run(
      `MATCH (completed:LearningRoute) WHERE completed.tursoId IN $ids
       MATCH (completed)-[:SIMILAR_TO]->(recommended:LearningRoute)
       WHERE NOT recommended.tursoId IN $ids
       RETURN recommended.tursoId AS id, recommended.title AS title
       LIMIT 5`,
      { ids: completedRouteIds.map(String) }
    );
    return result.records.map(r => ({ id: r.get('id'), title: r.get('title') }));
  } catch (err) {
    console.error('⚠️  Error obteniendo recomendaciones de Neo4j:', err.message);
    return [];
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
  try {
    await session.run(
      `MERGE (u:User {tursoId: $userId})
       MERGE (m:Module {title: $modTitle, routeId: $routeId})
       MERGE (u)-[c:COMPLETED]->(m)
       SET c.score = $score, c.date = datetime()`,
      { 
        userId: userId.toString(), 
        modTitle: moduleTitle, 
        routeId: routeId.toString(),
        score: score || 100
      }
    );
    console.log(`✅ Neo4j: Usuario ${userId} completó el módulo '${moduleTitle}'`);
  } catch (err) {
    console.error('❌ Error guardando progreso en Neo4j:', err.message);
  } finally {
    await session.close();
  }
};
