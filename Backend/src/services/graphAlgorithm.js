import graphlib from 'graphlib';
import { turso } from '../config/turso.js';
import { getUserSubjectKnowledgeData } from './knowledgeGraph.service.js';
import { syncRouteToGraph } from './neo4j.service.js';
import { generateCurricularFallbackAssessment } from './chat.service.js';

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

  // 6. Enriquecer temas ordenados con badges y tiempos adaptativos
  const orderedTopics = orderedTopicIds.map((id, index) => {
    const t = topicsMap.get(id);
    const selfLevel = t.selfLevel ? Math.max(1, Math.min(5, t.selfLevel)) : 3;
    const isReinforcement = selfLevel <= 2 || t.struggles === true;
    const isMastered = selfLevel >= 4;

    // Ajuste adaptativo del tiempo estimado según el nivel reportado
    let baseMins = t.estimatedMinutes || 30;
    let adaptiveMinutes = baseMins;
    if (selfLevel === 5) {
      adaptiveMinutes = Math.max(15, Math.round(baseMins * 0.4)); // Acreditación / repaso rápido
    } else if (selfLevel === 4) {
      adaptiveMinutes = Math.max(20, Math.round(baseMins * 0.7));
    } else if (selfLevel === 2) {
      adaptiveMinutes = Math.round(baseMins * 1.3);
    } else if (selfLevel === 1 || t.struggles) {
      adaptiveMinutes = Math.round(baseMins * 1.6); // Refuerzo y nivelación intensiva
    }

    let badge = '📘 Troncal';
    if (isReinforcement) {
      badge = '⚡ Refuerzo Sugerido';
    } else if (selfLevel === 5) {
      badge = '⭐ Dominio Avanzado Acreditado';
    } else if (selfLevel === 4) {
      badge = '✨ Nivel Práctico Consolidado';
    }

    return {
      ...t,
      selfLevel,
      order: index + 1,
      priorityScore: priorityScores.get(id),
      isReinforcement,
      isMastered,
      estimatedMinutes: adaptiveMinutes,
      badge
    };
  });

  // 7. Agrupar en módulos de aprendizaje según el perfil del autodiagnóstico
  const totalCount = orderedTopics.length;
  const avgSelfLevel = orderedTopics.reduce((acc, t) => acc + (t.selfLevel || 3), 0) / (totalCount || 1);
  const isMasteredProfile = avgSelfLevel >= 4.2; // La gran mayoría en 4 o 5
  const isBeginnerProfile = avgSelfLevel <= 2.2; // La gran mayoría en 1 o 2

  const structuredModules = [];
  let modIndex = 1;

  if (isMasteredProfile) {
    // ── PERFIL AVANZADO (Autodiagnóstico 4-5 en la mayoría de temas) ───────────────────
    // La ruta se optimiza como Acelerada de Consolidación y Retos de Maestría
    const chunkSize = 2;
    for (let i = 0; i < orderedTopics.length; i += chunkSize) {
      const chunk = orderedTopics.slice(i, i + chunkSize);
      const totalMins = chunk.reduce((acc, t) => acc + (t.estimatedMinutes || 20), 0);
      const mainNames = chunk.map(t => t.topicName || t.name).join(' y ');

      structuredModules.push({
        title: `Módulo ${modIndex}: Validación y Maestría Práctica de ${mainNames}`,
        description: `Módulo acelerado enfocado en retos de alto nivel y optimización para temas dominados (${chunk.map(t => t.topicName || t.name).join(', ')}).`,
        position: modIndex,
        isReinforcement: false,
        topics: chunk,
        estimatedMinutes: totalMins
      });
      modIndex++;
    }
  } else if (isBeginnerProfile) {
    // ── PERFIL PRINCIPIANTE (Autodiagnóstico 1-2 en la mayoría de temas) ────────────────
    // La ruta se estructura de forma progresiva paso a paso con módulos balanceados
    const chunkSize = 2;
    for (let i = 0; i < orderedTopics.length; i += chunkSize) {
      const chunk = orderedTopics.slice(i, i + chunkSize);
      const totalMins = chunk.reduce((acc, t) => acc + (t.estimatedMinutes || 45), 0);
      const mainNames = chunk.map(t => t.topicName || t.name).join(' y ');
      const phaseLabel = i === 0 ? 'Fundamentos y Nivelación Inicial' : (i + chunkSize >= orderedTopics.length ? 'Consolidación e Integración' : 'Refuerzo Guiado');

      structuredModules.push({
        title: `Módulo ${modIndex}: ${phaseLabel} - ${mainNames}`,
        description: `Aprendizaje paso a paso desde cero con recursos didácticos de refuerzo para: ${chunk.map(t => t.topicName || t.name).join(', ')}.`,
        position: modIndex,
        isReinforcement: true,
        topics: chunk,
        estimatedMinutes: totalMins
      });
      modIndex++;
    }
  } else {
    // ── PERFIL MIXTO / ADAPTATIVO ─────────────────────────────────────────────────────
    // Reconoce temas dominados para acreditación rápida y focaliza módulos de refuerzo en los vacíos
    const masteredTopics = orderedTopics.filter(t => t.isMastered);
    const reinforcementTopics = orderedTopics.filter(t => t.isReinforcement);
    const standardTopics = orderedTopics.filter(t => !t.isMastered && !t.isReinforcement);

    // Módulo 1: Convalidación y repaso rápido de temas dominados (si los hay)
    if (masteredTopics.length > 0) {
      const totalMins = masteredTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 20), 0);
      structuredModules.push({
        title: `Módulo ${modIndex}: Convalidación y Repaso de Conceptos Dominados`,
        description: `Módulo acelerado para acreditar competencias previas detectadas en tu diagnóstico (${masteredTopics.map(t => t.topicName || t.name).join(', ')}).`,
        position: modIndex,
        isReinforcement: false,
        topics: masteredTopics,
        estimatedMinutes: totalMins
      });
      modIndex++;
    }

    // Módulo 2: Refuerzo intensivo para temas con vacíos o dificultades (si los hay)
    if (reinforcementTopics.length > 0) {
      const totalMins = reinforcementTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 45), 0);
      structuredModules.push({
        title: `Módulo ${modIndex}: Nivelación y Refuerzo Focalizado`,
        description: `Módulo intensivo diseñado para cubrir vacíos conceptuales prioritarios (${reinforcementTopics.map(t => t.topicName || t.name).join(', ')}).`,
        position: modIndex,
        isReinforcement: true,
        topics: reinforcementTopics,
        estimatedMinutes: totalMins
      });
      modIndex++;
    }

    // Módulos estándar para temas intermedios (nivel 3)
    const chunkSize = 2;
    for (let i = 0; i < standardTopics.length; i += chunkSize) {
      const chunk = standardTopics.slice(i, i + chunkSize);
      const totalMins = chunk.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
      const mainNames = chunk.map(t => t.topicName || t.name).join(' y ');

      structuredModules.push({
        title: `Módulo ${modIndex}: Dominio Práctico de ${mainNames}`,
        description: `Desarrollo paso a paso de los temas: ${chunk.map(t => t.topicName || t.name).join(', ')}.`,
        position: modIndex,
        isReinforcement: false,
        topics: chunk,
        estimatedMinutes: totalMins
      });
      modIndex++;
    }
  }

  const totalEstimatedMinutes = orderedTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  const masteredCount = orderedTopics.filter(t => t.isMastered).length;
  const reinforcementCount = orderedTopics.filter(t => t.isReinforcement).length;
  const standardCount = orderedTopics.filter(t => !t.isMastered && !t.isReinforcement).length;

  const profileType = isMasteredProfile ? 'ADVANCED' : (isBeginnerProfile ? 'BEGINNER' : 'ADAPTIVE');

  return {
    orderedTopics,
    structuredModules,
    modules: structuredModules,
    profile: profileType,
    totalEstimatedMinutes,
    summary: {
      profileType,
      avgSelfLevel: Number(avgSelfLevel.toFixed(2)),
      masteredCount,
      reinforcementCount,
      standardCount,
      totalTopics: orderedTopics.length,
      totalEstimatedMinutes
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

  let routeTitle = `Ruta Adaptativa: ${subjectName}`;
  let routeDifficulty = 'ADAPTIVE';

  if (adaptivePlan.summary.profileType === 'ADVANCED') {
    routeTitle = `Ruta Acelerada: ${subjectName} (Nivel Avanzado)`;
    routeDifficulty = 'ADVANCED';
  } else if (adaptivePlan.summary.profileType === 'BEGINNER') {
    routeTitle = `Ruta Nivelatoria: ${subjectName} (Paso a Paso)`;
    routeDifficulty = 'BEGINNER';
  } else {
    routeTitle = `Ruta Adaptativa Focalizada: ${subjectName}`;
    routeDifficulty = 'ADAPTIVE';
  }

  const routeDescription = `Ruta calculada según tu autodiagnóstico (Promedio: ${adaptivePlan.summary.avgSelfLevel}/5). Incluye ${adaptivePlan.structuredModules.length} módulos con ${adaptivePlan.summary.masteredCount} temas convalidados y ${adaptivePlan.summary.reinforcementCount} temas de refuerzo pedagógico.`;

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
        adaptivePlan.totalEstimatedMinutes, // Minutos reales calculados adaptativamente
        routeDifficulty,
        JSON.stringify({
          subjectId,
          profileType: adaptivePlan.summary.profileType,
          avgSelfLevel: adaptivePlan.summary.avgSelfLevel,
          masteredCount: adaptivePlan.summary.masteredCount,
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

    // Insertar módulos en Turso y asociar recursos + evaluaciones precargadas
    for (const mod of adaptivePlan.structuredModules) {
      await turso.execute({
        sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
        args: [mod.title, mod.description, mod.position, createdRouteId]
      });

      const modRow = (await turso.execute({
        sql: `SELECT id FROM Module WHERE routeId = ? AND position = ? LIMIT 1`,
        args: [createdRouteId, mod.position]
      })).rows[0];
      const moduleId = modRow?.id;

      if (moduleId && mod.topics && mod.topics.length > 0) {
        let resPos = 1;
        for (const topic of mod.topics) {
          if (topic.resources && topic.resources.length > 0) {
            for (const r of topic.resources) {
              let rRow = (await turso.execute({
                sql: `SELECT id FROM Resource WHERE url = ? LIMIT 1`,
                args: [r.url]
              })).rows[0];

              let resId = rRow?.id;
              if (!resId) {
                await turso.execute({
                  sql: `INSERT INTO Resource (title, description, type, url, authorId)
                        VALUES (?, ?, ?, ?, ?)`,
                  args: [r.title, `Recurso del tema ${topic.topicName || topic.name}`, r.type || 'PDF', r.url, authorId || userId]
                });
                const newRes = (await turso.execute({
                  sql: `SELECT id FROM Resource WHERE url = ? LIMIT 1`,
                  args: [r.url]
                })).rows[0];
                resId = newRes?.id;
              }

              if (resId) {
                await turso.execute({
                  sql: `INSERT OR IGNORE INTO ModuleResource (moduleId, resourceId, position) VALUES (?, ?, ?)`,
                  args: [moduleId, resId, resPos++]
                });
              }
            }
          }
        }

        // Pre-generar la evaluación curricular para que esté lista al instante sin depender de cuota LLM
        const fallbackAssessment = generateCurricularFallbackAssessment(mod, [], 'completa');
        await turso.execute({
          sql: `INSERT OR IGNORE INTO ModuleAssessment (moduleId, type, content) VALUES (?, 'completa', ?)`,
          args: [moduleId, JSON.stringify(fallbackAssessment)]
        });
        await turso.execute({
          sql: `INSERT OR IGNORE INTO ModuleAssessment (moduleId, type, content) VALUES (?, 'teoria', ?)`,
          args: [moduleId, JSON.stringify({ questions: fallbackAssessment.questions })]
        });
        await turso.execute({
          sql: `INSERT OR IGNORE INTO ModuleAssessment (moduleId, type, content) VALUES (?, 'practica', ?)`,
          args: [moduleId, JSON.stringify({ practicalChallenge: fallbackAssessment.practicalChallenge })]
        });
      }
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
      difficulty: routeDifficulty,
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
          sql: `DELETE FROM ModuleResource WHERE moduleId IN (SELECT id FROM Module WHERE routeId = ?)`,
          args: [createdRouteId]
        });
        await turso.execute({
          sql: `DELETE FROM ModuleAssessment WHERE moduleId IN (SELECT id FROM Module WHERE routeId = ?)`,
          args: [createdRouteId]
        });
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
