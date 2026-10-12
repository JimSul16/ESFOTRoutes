import graphlib from 'graphlib';
import { turso } from '../config/turso.js';
import { getUserSubjectKnowledgeData } from './knowledgeGraph.service.js';
import { syncRouteToGraph } from './neo4j.service.js';

/**
 * Desarma ciclos en el grafo eliminando preferentemente aristas de tipo SOFT o de menor impacto
 */
export const breakCycles = (g, edgeMetadata) => {
  let cycles = graphlib.alg.findCycles(g);
  let iterations = 0;
  const maxIterations = 50;

  while (cycles.length > 0 && iterations < maxIterations) {
    iterations++;
    const cycleNodes = new Set(cycles[0]);
    let edgeRemoved = false;

    // 1. Encontrar todas las aristas reales dirigidas entre los nodos del ciclo
    const cycleEdges = [];
    for (const u of cycleNodes) {
      const outEdges = g.outEdges(u) || [];
      for (const e of outEdges) {
        if (cycleNodes.has(e.w)) {
          cycleEdges.push({ u: e.v, w: e.w, key: `${e.v}->${e.w}` });
        }
      }
    }

    // 2. Intentar remover aristas débiles (SOFT) dentro del ciclo
    for (const edge of cycleEdges) {
      const meta = edgeMetadata?.get(edge.key);
      if (meta && meta.strength === 'SOFT') {
        g.removeEdge(edge.u, edge.w);
        edgeMetadata?.delete(edge.key);
        edgeRemoved = true;
        console.warn(`⚠️ Ciclo detectado: Se desactivó la dependencia débil (SOFT) '${edge.key}' para mantener la aciclicidad.`);
        break;
      }
    }

    // 3. Si no hay aristas SOFT, remover la primera arista real del ciclo
    if (!edgeRemoved && cycleEdges.length > 0) {
      const edge = cycleEdges[0];
      g.removeEdge(edge.u, edge.w);
      edgeMetadata?.delete(edge.key);
      console.warn(`⚠️ Ciclo crítico detectado: Se removió la arista '${edge.key}' para evitar bucle infinito curricular.`);
    }

    cycles = graphlib.alg.findCycles(g);
  }

  return graphlib.alg.isAcyclic(g);
};

/**
 * Calcula el orden topológico adaptativo y estructuración de módulos
 * @param {Array} topicsData Temas con prerrequisitos, autodiagnóstico y dificultades
 * @returns {Object} { orderedTopics, structuredModules, totalEstimatedMinutes, summary }
 */
export const computeAdaptiveRoute = (topicsData = []) => {
  if (!topicsData || topicsData.length === 0) {
    return {
      orderedTopics: [],
      structuredModules: [],
      totalEstimatedMinutes: 0,
      summary: { reinforcementCount: 0, standardCount: 0 }
    };
  }

  const g = new graphlib.Graph({ directed: true });
  const edgeMetadata = new Map();
  const topicsMap = new Map();

  // 1. Registrar nodos
  for (const topic of topicsData) {
    topicsMap.set(topic.topicId, topic);
    g.setNode(topic.topicId, topic);
  }

  // 2. Registrar aristas dirigidas (prereq -> topic: el prerrequisito DEBE aprenderse antes)
  for (const topic of topicsData) {
    if (topic.prerequisites && topic.prerequisites.length > 0) {
      for (const p of topic.prerequisites) {
        if (topicsMap.has(p.id)) {
          g.setEdge(p.id, topic.topicId);
          edgeMetadata.set(`${p.id}->${topic.topicId}`, {
            strength: p.strength || 'HARD'
          });
        }
      }
    }
  }

  // 3. Garantizar aciclicidad (desarme de ciclos)
  if (!graphlib.alg.isAcyclic(g)) {
    breakCycles(g, edgeMetadata);
  }

  // 4. Calcular prioridad pedagógica para cada tema
  // Base = (6 - selfLevel) * 10
  // Impacto = outDegree * 15 (temas que desbloquean más contenido)
  // Refuerzo = struggles ? 20 : 0
  const priorityScores = new Map();

  for (const topic of topicsData) {
    const selfLevel = topic.selfLevel ? Math.max(1, Math.min(5, topic.selfLevel)) : 3;
    const base = (6 - selfLevel) * 10;
    const outEdges = g.outEdges(topic.topicId) || [];
    const impact = outEdges.length * 15;
    const strugglesBonus = topic.struggles ? 20 : 0;

    const totalPriority = base + impact + strugglesBonus;
    priorityScores.set(topic.topicId, totalPriority);
  }

  // 5. Orden topológico con cola de prioridad (Algoritmo de Kahn ponderado)
  const inDegree = new Map();
  for (const node of g.nodes()) {
    const inEdges = g.inEdges(node) || [];
    inDegree.set(node, inEdges.length);
  }

  // Cola de temas listos (inDegree === 0)
  const readyQueue = [];
  for (const [node, deg] of inDegree.entries()) {
    if (deg === 0) {
      readyQueue.push(node);
    }
  }

  const orderedTopicIds = [];

  while (readyQueue.length > 0) {
    // Ordenar listos por mayor prioridad pedagógica
    readyQueue.sort((a, b) => (priorityScores.get(b) || 0) - (priorityScores.get(a) || 0));
    const nextId = readyQueue.shift();
    orderedTopicIds.push(nextId);

    const outEdges = g.outEdges(nextId) || [];
    for (const edge of outEdges) {
      const target = edge.w;
      const currentDeg = inDegree.get(target) - 1;
      inDegree.set(target, currentDeg);
      if (currentDeg === 0) {
        readyQueue.push(target);
      }
    }
  }

  // 6. Enriquecer temas ordenados
  const orderedTopics = orderedTopicIds.map((id, index) => {
    const t = topicsMap.get(id);
    const selfLevel = t.selfLevel || 3;
    const isReinforcement = selfLevel <= 2 || t.struggles === true;
    return {
      ...t,
      order: index + 1,
      priorityScore: priorityScores.get(id),
      isReinforcement,
      badge: isReinforcement ? '⚡ Refuerzo Sugerido' : (selfLevel >= 4 ? '⭐ Nivel Avanzado' : '📘 Troncal')
    };
  });

  // 7. Agrupar en módulos de aprendizaje coherentes para la plataforma
  const reinforcementTopics = orderedTopics.filter(t => t.isReinforcement);
  const standardTopics = orderedTopics.filter(t => !t.isReinforcement);

  const structuredModules = [];
  let modIndex = 1;

  if (reinforcementTopics.length > 0) {
    const totalMins = reinforcementTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
    structuredModules.push({
      title: `Módulo ${modIndex}: Nivelación y Refuerzo Conceptual`,
      description: `Módulo personalizado de refuerzo enfocado en nivelar conceptos clave detectados en tu autodiagnóstico (${reinforcementTopics.map(t => t.topicName).join(', ')}).`,
      position: modIndex,
      isReinforcement: true,
      topics: reinforcementTopics,
      estimatedMinutes: totalMins
    });
    modIndex++;
  }

  // Agrupar los temas estándar en bloques de 2-3 temas para estructurar la ruta
  const chunkSize = 2;
  for (let i = 0; i < standardTopics.length; i += chunkSize) {
    const chunk = standardTopics.slice(i, i + chunkSize);
    const totalMins = chunk.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
    const mainNames = chunk.map(t => t.topicName).join(' y ');

    structuredModules.push({
      title: `Módulo ${modIndex}: Dominio Práctico de ${mainNames}`,
      description: `Desarrollo paso a paso de los temas: ${chunk.map(t => t.topicName).join(', ')}.`,
      position: modIndex,
      isReinforcement: false,
      topics: chunk,
      estimatedMinutes: totalMins
    });
    modIndex++;
  }

  const totalEstimatedMinutes = orderedTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);

  return {
    orderedTopics,
    structuredModules,
    totalEstimatedMinutes,
    summary: {
      reinforcementCount: reinforcementTopics.length,
      standardCount: standardTopics.length,
      totalTopics: orderedTopics.length
    }
  };
};

/**
 * Genera la ruta adaptativa, la guarda en Turso y la sincroniza con Neo4j (con rollback en caso de fallo)
 */
export const generateAndPersistAdaptiveRoute = async ({ userId, subjectId, authorId }) => {
  // 1. Obtener datos del grafo
  const topicsData = await getUserSubjectKnowledgeData(userId, subjectId);
  if (!topicsData || topicsData.length === 0) {
    throw new Error(`No se encontraron temas curriculares para la materia '${subjectId}'.`);
  }

  // 2. Calcular la ruta adaptativa
  const adaptivePlan = computeAdaptiveRoute(topicsData);
  const subjectName = subjectId === 'redes' ? 'Redes de Computadoras' : (subjectId === 'web' ? 'Desarrollo de Aplicaciones Web' : subjectId.toUpperCase());
  const routeTitle = `Ruta Adaptativa: ${subjectName}`;
  const routeDescription = `Ruta personalizada generada mediante Grafo de Conocimiento y autodiagnóstico. Contiene ${adaptivePlan.structuredModules.length} módulos y ${adaptivePlan.orderedTopics.length} temas optimizados con orden topológico.`;
  const estimatedHours = Math.ceil(adaptivePlan.totalEstimatedMinutes / 60);

  // 3. Persistir en Turso
  let createdRouteId = null;

  try {
    await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, subjectId, estimatedTime, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        routeTitle,
        routeDescription,
        subjectName,
        subjectId,
        estimatedHours,
        'ADAPTIVE',
        JSON.stringify({
          subjectId,
          reinforcementCount: adaptivePlan.summary.reinforcementCount,
          totalTopics: adaptivePlan.orderedTopics.length,
          generatedVia: 'KnowledgeGraphDAG'
        }),
        authorId || userId
      ]
    });

    const routeResult = await turso.execute({
      sql: `SELECT id FROM LearningRoute WHERE authorId = ? ORDER BY id DESC LIMIT 1`,
      args: [authorId || userId]
    });
    createdRouteId = routeResult.rows[0].id;

    // Insertar módulos en Turso
    for (const mod of adaptivePlan.structuredModules) {
      await turso.execute({
        sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
        args: [mod.title, mod.description, mod.position, createdRouteId]
      });
    }

    // Inscribir automáticamente al estudiante en la ruta adaptativa generada para que aparezca en "Mis Rutas"
    await turso.execute({
      sql: `INSERT OR IGNORE INTO Enrollment (userId, learningRouteId) VALUES (?, ?)`,
      args: [userId, createdRouteId]
    });

    // 4. Sincronizar en Neo4j AuraDB
    const neo4jModules = adaptivePlan.structuredModules.map(m => ({ title: m.title }));
    await syncRouteToGraph(createdRouteId, routeTitle, subjectName, neo4jModules);

    return {
      success: true,
      routeId: createdRouteId,
      title: routeTitle,
      modules: adaptivePlan.structuredModules,
      summary: adaptivePlan.summary,
      totalEstimatedMinutes: adaptivePlan.totalEstimatedMinutes
    };
  } catch (error) {
    console.error('❌ Error durante la persistencia dual de la ruta adaptativa:', error);

    // Transacción Compensatoria (Rollback en Turso si falló o si Neo4j no respondió)
    if (createdRouteId) {
      console.warn(`🔄 Ejecutando rollback compensatorio en Turso para routeId ${createdRouteId}...`);
      try {
        await turso.execute({
          sql: `DELETE FROM Enrollment WHERE learningRouteId = ?`,
          args: [createdRouteId]
        });
        await turso.execute({
          sql: `DELETE FROM Module WHERE routeId = ?`,
          args: [createdRouteId]
        });
        await turso.execute({
          sql: `DELETE FROM LearningRoute WHERE id = ?`,
          args: [createdRouteId]
        });
        console.log(`✅ Rollback compensatorio completado con éxito.`);
      } catch (rollbackErr) {
        console.error('CRITICAL: Falló rollback compensatorio en Turso:', rollbackErr.message);
      }
    }

    throw new Error(`Fallo en la persistencia de la ruta adaptativa: ${error.message}`);
  }
};
