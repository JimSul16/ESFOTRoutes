import { getDriver } from './neo4j.service.js';
import { turso } from '../config/turso.js';
// RR-013: las semillas curriculares se reutilizan como catálogo local de
// respaldo cuando Neo4j no está configurado o el grafo viene vacío, para no
// devolver una lista de materias vacía en silencio.
import { redesSubject } from '../seeds/seedRedes.js';
import { webSubject } from '../seeds/seedAplicacionesWeb.js';
import "dotenv/config";

const getSession = (driver) => {
  const database = process.env.NEO4J_DATABASE || 'neo4j';
  return driver.session({ database });
};

// ── Catálogo curricular local (respaldo de Neo4j) ─────────────────────────────

/** Materias que conoce el proyecto (mismo dato que siembra `seedKnowledgeGraph.js`). */
const FALLBACK_SUBJECTS = [redesSubject, webSubject];

/** Índice id → nombre de TODOS los temas, para resolver prerrequisitos cruzados. */
const buildTopicNameIndex = () => {
  const index = new Map();
  for (const subject of FALLBACK_SUBJECTS) {
    for (const mod of subject.modules) {
      for (const topic of mod.topics) {
        index.set(topic.id, topic.name);
      }
    }
  }
  return index;
};

const FALLBACK_TOPIC_NAMES = buildTopicNameIndex();

/**
 * Listado de materias con conteos, calculado desde las semillas locales.
 * Tiene la misma forma que la consulta a Neo4j.
 */
const getFallbackSubjectsWithCounts = () =>
  FALLBACK_SUBJECTS.map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    description: subject.description,
    credits: subject.credits,
    moduleCount: subject.modules.length,
    topicCount: subject.modules.reduce((total, mod) => total + mod.topics.length, 0)
  }));

/**
 * Temario de una materia desde las semillas locales, con la misma forma que
 * `getSubjectTopicsWithPrereqs` (prerrequisitos como `{id, name, strength}`).
 *
 * @param {string} subjectId
 * @returns {Array} módulos con sus temas, o `[]` si la materia no existe.
 */
const getFallbackSubjectTopics = (subjectId) => {
  const subject = FALLBACK_SUBJECTS.find((s) => s.id === subjectId);
  if (!subject) return [];

  return subject.modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((mod) => ({
      id: mod.id,
      name: mod.name,
      position: mod.position,
      topics: mod.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        difficulty: topic.difficulty,
        estimatedMinutes: topic.estimatedMinutes,
        prerequisites: (topic.prerequisites || [])
          .filter((p) => p && p.targetId)
          .map((p) => ({
            id: p.targetId,
            name: FALLBACK_TOPIC_NAMES.get(p.targetId) || p.targetId,
            strength: p.strength || 'HARD'
          })),
        resources: topic.resources || []
      }))
    }));
};

/**
 * Texto del subgrafo curricular completo desde el catálogo local (RR-015).
 * Formato: materias → módulos → temas con sus prerrequisitos.
 */
const buildLocalCurriculumText = () => {
  const lines = [];
  for (const subject of FALLBACK_SUBJECTS) {
    lines.push(`- Materia: ${subject.name} (${subject.code})`);
    for (const mod of subject.modules.slice().sort((a, b) => a.position - b.position)) {
      lines.push(`  - Módulo: ${mod.name}`);
      for (const topic of mod.topics) {
        const prereqs = (topic.prerequisites || [])
          .map((p) => FALLBACK_TOPIC_NAMES.get(p.targetId) || p.targetId)
          .join(', ');
        lines.push(
          `    - Tema (${topic.difficulty}): ${topic.name}` +
          (prereqs ? ` [Prerrequisitos: ${prereqs}]` : '')
        );
      }
    }
  }
  return lines.join('\n');
};

/**
 * Subgrafo curricular COMPLETO en texto, para el prompt del asistente (RR-015).
 *
 * Antes el chat solo inyectaba contexto si resolvía un tema concreto; si no,
 * caía a un resumen global de 5 materias (o a nada si Neo4j faltaba) y el
 * modelo respondía "sin tener el grafo". Ahora se fuerza la inyección del
 * subgrafo entero (materias → módulos → temas con prerrequisitos) en todo
 * mensaje sin tema resoluble, con respaldo al catálogo local.
 *
 * @returns {Promise<{available: boolean, text: string, source: 'neo4j'|'local'|null, reason: string|null}>}
 */
export const getFullCurriculumContext = async () => {
  const MAX_CHARS = 15000;

  const truncate = (text) =>
    text.length > MAX_CHARS
      ? `${text.slice(0, MAX_CHARS)}\n[Contexto truncado por longitud]`
      : text;

  const driver = getDriver();

  if (!driver) {
    const local = buildLocalCurriculumText();
    if (local) {
      console.warn('⚠️ RR-015: Neo4j no configurado; contexto curricular tomado del catálogo local.');
      return {
        available: true,
        text: truncate(local),
        source: 'local',
        reason: 'Neo4j no está configurado en el servidor; se usó el catálogo curricular local.'
      };
    }
    return {
      available: false,
      text: '',
      source: null,
      reason: 'Neo4j no está configurado (faltan NEO4J_URI / NEO4J_PASSWORD) y no hay catálogo local disponible.'
    };
  }

  try {
    const session = getSession(driver);
    try {
      const result = await session.run(`
        MATCH (s:Subject)-[:HAS_MODULE]->(m:Module)-[:CONTAINS_TOPIC]->(t:Topic)
        OPTIONAL MATCH (t)-[p:PREREQUISITE]->(prereq:Topic)
        RETURN s.id AS subjectId,
               s.name AS subjectName,
               s.code AS subjectCode,
               m.name AS moduleName,
               m.position AS modulePosition,
               t.name AS topicName,
               t.difficulty AS difficulty,
               collect(DISTINCT prereq.name) AS prereqNames
        ORDER BY m.position ASC, t.id ASC
      `);

      if (result.records.length === 0) {
        const local = buildLocalCurriculumText();
        if (local) {
          console.warn('⚠️ RR-015: el grafo está vacío; contexto curricular tomado del catálogo local.');
          return {
            available: true,
            text: truncate(local),
            source: 'local',
            reason: 'El grafo de conocimiento está vacío (semillas no ejecutadas); se usó el catálogo local.'
          };
        }
        return {
          available: false,
          text: '',
          source: null,
          reason: 'El grafo de conocimiento está vacío (las semillas curriculares no se ejecutaron).'
        };
      }

      const lines = [];
      let currentSubject = null;
      let currentModule = null;

      for (const record of result.records) {
        const subjectId = record.get('subjectId');
        const moduleName = record.get('moduleName');

        if (subjectId !== currentSubject) {
          currentSubject = subjectId;
          currentModule = null;
          const code = record.get('subjectCode');
          lines.push(`- Materia: ${record.get('subjectName')}${code ? ` (${code})` : ''}`);
        }

        if (moduleName !== currentModule) {
          currentModule = moduleName;
          lines.push(`  - Módulo: ${moduleName}`);
        }

        const prereqs = (record.get('prereqNames') || []).filter(Boolean).join(', ');
        lines.push(
          `    - Tema (${record.get('difficulty')}): ${record.get('topicName')}` +
          (prereqs ? ` [Prerrequisitos: ${prereqs}]` : '')
        );
      }

      return {
        available: true,
        text: truncate(lines.join('\n')),
        source: 'neo4j',
        reason: null
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('❌ RR-015: error consultando el grafo curricular:', error.message);
    const local = buildLocalCurriculumText();
    if (local) {
      return {
        available: true,
        text: truncate(local),
        source: 'local',
        reason: `Neo4j no respondió (${error.message}); se usó el catálogo curricular local.`
      };
    }
    return {
      available: false,
      text: '',
      source: null,
      reason: `Neo4j no respondió (${error.message}).`
    };
  }
};

/**
 * Normaliza el score de `SIMILAR_TO` a la escala 0-100 del contrato.
 *
 * En la base de datos el score se guarda en escala 0-1 (`seedKnowledgeGraph.js`
 * escribe `r1.score = 0.85`), pero `GraphRecommendation.matchScore` está
 * tipado como 0-100 y el frontend lo pintaba tal cual: 0.85 se veía como
 * "1% de afinidad". Se normaliza en el borde del servicio para que el tipo
 * deje de mentir.
 *
 * @param {number|{toNumber: () => number}|null|undefined} raw
 * @returns {number|null} 0-100, o `null` si no hay dato utilizable.
 */
export const normalizeAffinityScore = (raw) => {
  if (raw === null || raw === undefined) return null;

  const value = typeof raw?.toNumber === 'function' ? raw.toNumber() : Number(raw);
  if (!Number.isFinite(value)) return null;

  // Escala 0-1 → 0-100. Si ya viniera en 0-100 se respeta tal cual.
  const scaled = value > 0 && value <= 1 ? value * 100 : value;
  return Math.round(scaled);
};

/**
 * Inicializar restricciones e índices en Neo4j AuraDB
 */
export const initGraphConstraints = async () => {
  const driver = getDriver();
  if (!driver) throw new Error('Driver de Neo4j no disponible');

  const session = getSession(driver);
  try {
    const queries = [
      'CREATE CONSTRAINT subject_id_unique IF NOT EXISTS FOR (s:Subject) REQUIRE s.id IS UNIQUE',
      'CREATE CONSTRAINT module_id_unique IF NOT EXISTS FOR (m:Module) REQUIRE m.id IS UNIQUE',
      'CREATE CONSTRAINT topic_id_unique IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE',
      'CREATE CONSTRAINT user_turso_unique IF NOT EXISTS FOR (u:User) REQUIRE u.tursoId IS UNIQUE',
      'CREATE INDEX topic_name_idx IF NOT EXISTS FOR (t:Topic) ON (t.name)'
    ];

    for (const q of queries) {
      await session.run(q);
    }
    console.log('✅ Restricciones e índices de Neo4j configurados correctamente.');
    return true;
  } catch (error) {
    console.error('❌ Error configurando restricciones de Neo4j:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Listar materias disponibles en el catálogo curricular con conteo de módulos y temas
 *
 * RR-013: antes devolvía `[]` en silencio cuando Neo4j no estaba configurado
 * (o el grafo venía vacío) y el frontend se quedaba en "Cargando catálogo..."
 * para siempre. Ahora se registra el error y se responde con el catálogo
 * curricular local (las mismas materias que siembra `seedKnowledgeGraph.js`),
 * de modo que el listado siempre incluye Redes de Computadoras y Desarrollo
 * de Aplicaciones Web.
 */
export const getSubjectsWithCounts = async () => {
  const driver = getDriver();
  if (!driver) {
    console.error(
      '❌ RR-013: Neo4j no está configurado (NEO4J_URI / NEO4J_PASSWORD vacíos). ' +
      'Usando el catálogo curricular local como respaldo.'
    );
    return getFallbackSubjectsWithCounts();
  }

  const session = getSession(driver);
  try {
    const result = await session.run(`
      MATCH (s:Subject)
      OPTIONAL MATCH (s)-[:HAS_MODULE]->(m:Module)
      OPTIONAL MATCH (m)-[:CONTAINS_TOPIC]->(t:Topic)
      RETURN s.id AS id,
             s.name AS name,
             s.code AS code,
             s.description AS description,
             s.credits AS credits,
             count(DISTINCT m) AS moduleCount,
             count(DISTINCT t) AS topicCount
      ORDER BY s.name ASC
    `);

    const subjects = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      code: record.get('code'),
      description: record.get('description'),
      credits: record.get('credits') ? (record.get('credits').toNumber ? record.get('credits').toNumber() : record.get('credits')) : 0,
      moduleCount: record.get('moduleCount').toNumber ? record.get('moduleCount').toNumber() : Number(record.get('moduleCount')),
      topicCount: record.get('topicCount').toNumber ? record.get('topicCount').toNumber() : Number(record.get('topicCount'))
    }));

    // Grafo accesible pero sin materias sembradas: no devolver [] en silencio.
    if (subjects.length === 0) {
      console.error(
        '⚠️ RR-013: Neo4j respondió 0 materias (grafo vacío o semillas no ejecutadas). ' +
        'Usando el catálogo curricular local como respaldo. Ejecuta: node src/seeds/seedKnowledgeGraph.js'
      );
      return getFallbackSubjectsWithCounts();
    }

    return subjects;
  } catch (error) {
    console.error('❌ Error obteniendo materias de Neo4j:', error.message);
    console.error('⚠️ RR-013: se responde con el catálogo curricular local como respaldo.');
    return getFallbackSubjectsWithCounts();
  } finally {
    await session.close();
  }
};

/**
 * Obtener módulos y temas con sus prerrequisitos para autodiagnóstico
 *
 * RR-013: igual que `getSubjectsWithCounts`, si Neo4j no está disponible se
 * responde desde el catálogo local en vez de devolver `[]` en silencio.
 */
export const getSubjectTopicsWithPrereqs = async (subjectId) => {
  const driver = getDriver();
  if (!driver) {
    console.error(
      `❌ RR-013: Neo4j no está configurado; temario de "${subjectId}" resuelto desde el catálogo local.`
    );
    return getFallbackSubjectTopics(subjectId);
  }

  const session = getSession(driver);
  try {
    const result = await session.run(`
      MATCH (s:Subject {id: $subjectId})-[:HAS_MODULE]->(m:Module)-[:CONTAINS_TOPIC]->(t:Topic)
      OPTIONAL MATCH (t)-[p:PREREQUISITE]->(prereq:Topic)
      OPTIONAL MATCH (t)-[:HAS_RESOURCE]->(r:Resource)
      RETURN m.id AS moduleId,
             m.name AS moduleName,
             m.position AS modulePosition,
             t.id AS topicId,
             t.name AS topicName,
             t.description AS description,
             t.difficulty AS difficulty,
             t.estimatedMinutes AS estimatedMinutes,
             collect(DISTINCT {
               id: prereq.id,
               name: prereq.name,
               strength: p.strength
             }) AS prerequisites,
             collect(DISTINCT {
               id: r.id,
               title: r.title,
               url: r.url,
               type: r.type
             }) AS resources
      ORDER BY m.position ASC, t.id ASC
    `, { subjectId });

    const modulesMap = new Map();

    result.records.forEach(record => {
      const moduleId = record.get('moduleId');
      const moduleName = record.get('moduleName');
      const modulePosition = record.get('modulePosition')?.toNumber ? record.get('modulePosition').toNumber() : Number(record.get('modulePosition') || 0);

      if (!modulesMap.has(moduleId)) {
        modulesMap.set(moduleId, {
          id: moduleId,
          name: moduleName,
          position: modulePosition,
          topics: []
        });
      }

      const rawPrereqs = record.get('prerequisites') || [];
      const validPrereqs = rawPrereqs.filter(p => p && p.id);

      const rawResources = record.get('resources') || [];
      const validResources = rawResources.filter(r => r && r.id);

      modulesMap.get(moduleId).topics.push({
        id: record.get('topicId'),
        name: record.get('topicName'),
        description: record.get('description'),
        difficulty: record.get('difficulty'),
        estimatedMinutes: record.get('estimatedMinutes')?.toNumber ? record.get('estimatedMinutes').toNumber() : Number(record.get('estimatedMinutes') || 30),
        prerequisites: validPrereqs,
        resources: validResources
      });
    });

    if (modulesMap.size === 0) {
      // Materia sin nodos en el grafo (semillas no ejecutadas): respaldo local.
      const fallback = getFallbackSubjectTopics(subjectId);
      if (fallback.length > 0) {
        console.error(
          `⚠️ RR-013: Neo4j no tiene el temario de "${subjectId}". Usando el catálogo local.`
        );
        return fallback;
      }
      return [];
    }

    return Array.from(modulesMap.values()).sort((a, b) => a.position - b.position);
  } catch (error) {
    console.error('❌ Error obteniendo temas de materia en Neo4j:', error.message);
    const fallback = getFallbackSubjectTopics(subjectId);
    if (fallback.length > 0) {
      console.error(`⚠️ RR-013: se responde con el catálogo local para "${subjectId}".`);
      return fallback;
    }
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Guardar autodiagnóstico de un estudiante por temas (HU-013)
 * @param {string|number} userId
 * @param {Array<{topicId: string, level: number}>} diagnoses
 */
export const saveUserSelfDiagnosis = async (userId, diagnoses = []) => {
  const driver = getDriver();
  if (!driver) throw new Error('Driver de Neo4j no disponible');

  const session = getSession(driver);
  try {
    // Asegurar usuario
    await session.run(`
      MERGE (u:User {tursoId: $userId})
    `, { userId: userId.toString() });

    // Guardar o actualizar relaciones SELF_REPORTED
    for (const item of diagnoses) {
      if (!item.topicId) continue;
      const level = Math.max(1, Math.min(5, Number(item.level) || 1));

      await session.run(`
        MATCH (u:User {tursoId: $userId})
        MATCH (t:Topic {id: $topicId})
        MERGE (u)-[sr:SELF_REPORTED]->(t)
        SET sr.level = $level,
            sr.date = datetime()
      `, {
        userId: userId.toString(),
        topicId: item.topicId,
        level
      });
    }

    console.log(`✅ Autodiagnóstico guardado en Neo4j para usuario ${userId} (${diagnoses.length} temas)`);
    return { success: true, count: diagnoses.length };
  } catch (error) {
    console.error('❌ Error guardando autodiagnóstico en Neo4j:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Obtener subgrafo completo de un usuario para una materia (temas, autodiagnóstico, aprobados, dificultades y prerrequisitos)
 */
export const getUserSubjectKnowledgeData = async (userId, subjectId) => {
  const driver = getDriver();
  if (!driver) throw new Error('Driver de Neo4j no disponible');

  const session = getSession(driver);
  try {
    const result = await session.run(`
      MATCH (s:Subject {id: $subjectId})-[:HAS_MODULE]->(m:Module)-[:CONTAINS_TOPIC]->(t:Topic)
      OPTIONAL MATCH (t)-[p:PREREQUISITE]->(prereq:Topic)
      OPTIONAL MATCH (u:User {tursoId: $userId})-[sr:SELF_REPORTED]->(t)
      OPTIONAL MATCH (u)-[c:COMPLETED]->(t)
      OPTIONAL MATCH (u)-[sw:STRUGGLES_WITH]->(t)
      OPTIONAL MATCH (t)-[:HAS_RESOURCE]->(r:Resource)
      RETURN t.id AS topicId,
             t.name AS topicName,
             t.description AS description,
             t.difficulty AS difficulty,
             t.estimatedMinutes AS estimatedMinutes,
             m.id AS moduleId,
             m.name AS moduleName,
             m.position AS modulePosition,
             sr.level AS selfLevel,
             c.score AS completedScore,
             sw.reason AS strugglesReason,
             collect(DISTINCT {
               id: prereq.id,
               name: prereq.name,
               strength: p.strength
             }) AS prerequisites,
             collect(DISTINCT {
               id: r.id,
               title: r.title,
               url: r.url,
               type: r.type
             }) AS resources
      ORDER BY m.position ASC, t.id ASC
    `, {
      userId: userId.toString(),
      subjectId
    });

    return result.records.map(record => {
      const rawPrereqs = record.get('prerequisites') || [];
      const validPrereqs = rawPrereqs.filter(p => p && p.id);

      const rawResources = record.get('resources') || [];
      const validResources = rawResources.filter(r => r && r.id);

      const selfLevel = record.get('selfLevel');
      const completedScore = record.get('completedScore');

      return {
        topicId: record.get('topicId'),
        topicName: record.get('topicName'),
        description: record.get('description'),
        difficulty: record.get('difficulty'),
        estimatedMinutes: record.get('estimatedMinutes')?.toNumber ? record.get('estimatedMinutes').toNumber() : Number(record.get('estimatedMinutes') || 30),
        moduleId: record.get('moduleId'),
        moduleName: record.get('moduleName'),
        modulePosition: record.get('modulePosition')?.toNumber ? record.get('modulePosition').toNumber() : Number(record.get('modulePosition') || 0),
        selfLevel: selfLevel !== null && selfLevel !== undefined ? (selfLevel.toNumber ? selfLevel.toNumber() : Number(selfLevel)) : null,
        completedScore: completedScore !== null && completedScore !== undefined ? (completedScore.toNumber ? completedScore.toNumber() : Number(completedScore)) : null,
        isCompleted: completedScore !== null && completedScore !== undefined && Number(completedScore) >= 70,
        struggles: record.get('strugglesReason') !== null,
        strugglesReason: record.get('strugglesReason'),
        prerequisites: validPrereqs,
        resources: validResources
      };
    });
  } catch (error) {
    console.error('❌ Error obteniendo subgrafo de usuario en Neo4j:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Registrar dificultad detectada con un tema (evaluación reprobada o bloqueo en chat)
 */
export const markTopicStruggle = async (userId, topicId, reason = 'Bajo desempeño en evaluación') => {
  const driver = getDriver();
  if (!driver) return;

  const session = getSession(driver);
  try {
    await session.run(`
      MERGE (u:User {tursoId: $userId})
      MATCH (t:Topic {id: $topicId})
      MERGE (u)-[sw:STRUGGLES_WITH]->(t)
      SET sw.reason = $reason,
          sw.date = datetime()
    `, {
      userId: userId.toString(),
      topicId,
      reason
    });
    console.log(`⚠️  Neo4j: Registrada dificultad para usuario ${userId} en tema ${topicId}`);
  } catch (error) {
    console.error('❌ Error registrando dificultad en Neo4j:', error.message);
  } finally {
    await session.close();
  }
};

/**
 * Obtener contexto local de un tema para GraphRAG (Chatbot)
 */
export const getTopicContextForChat = async (topicId) => {
  const driver = getDriver();
  if (!driver) return null;

  const session = getSession(driver);
  try {
    const result = await session.run(`
      MATCH (t:Topic {id: $topicId})
      OPTIONAL MATCH (s:Subject)-[:HAS_MODULE]->(m:Module)-[:CONTAINS_TOPIC]->(t)
      OPTIONAL MATCH (t)-[p:PREREQUISITE]->(prereq:Topic)
      OPTIONAL MATCH (unlocked:Topic)-[p2:PREREQUISITE]->(t)
      OPTIONAL MATCH (t)-[:HAS_RESOURCE]->(r:Resource)
      RETURN t.id AS id,
             t.name AS name,
             t.description AS description,
             t.difficulty AS difficulty,
             s.name AS subjectName,
             m.name AS moduleName,
             collect(DISTINCT {name: prereq.name, strength: p.strength}) AS prerequisites,
             collect(DISTINCT unlocked.name) AS unlocks,
             collect(DISTINCT {title: r.title, url: r.url, type: r.type}) AS resources
    `, { topicId });

    if (result.records.length === 0) return null;

    const record = result.records[0];
    return {
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      difficulty: record.get('difficulty'),
      subjectName: record.get('subjectName'),
      moduleName: record.get('moduleName'),
      prerequisites: (record.get('prerequisites') || []).filter(p => p && p.name),
      unlocks: (record.get('unlocks') || []).filter(Boolean),
      resources: (record.get('resources') || []).filter(r => r && r.title)
    };
  } catch (error) {
    console.error('❌ Error obteniendo contexto de tema para chat en Neo4j:', error.message);
    return null;
  } finally {
    await session.close();
  }
};

/**
 * Materias (subjectId) en las que el usuario ya está inscrito.
 *
 * Fuente de verdad: Turso (`Enrollment` → `LearningRoute.subjectId`).
 * La relación `ENROLLED_IN` del grafo es una caché que se rellena al
 * enrolar; este listado la complementa para que la exclusión se aplique
 * también a las inscripciones anteriores a esa sincronización.
 */
export const getEnrolledSubjectIds = async (userId) => {
  try {
    const result = await turso.execute({
      sql: `SELECT DISTINCT lr.subjectId AS subjectId
            FROM Enrollment e
            JOIN LearningRoute lr ON lr.id = e.learningRouteId
            WHERE e.userId = ? AND lr.subjectId IS NOT NULL AND lr.subjectId <> ''`,
      args: [userId]
    });
    return result.rows.map(r => r.subjectId).filter(Boolean);
  } catch (error) {
    console.error('❌ Error obteniendo materias inscritas:', error.message);
    return [];
  }
};

/**
 * Refleja en el grafo la inscripción del alumno en una materia.
 *
 * La relación `ENROLLED_IN` la consulta `getCrossCurricularRecommendations`
 * para no recomendar materias en las que el alumno ya está inscrito. Antes
 * no la creaba nadie: la condición `NOT (u)-[:ENROLLED_IN]->(target)` era
 * siempre verdadera y el sistema recomendaba la materia en la que el alumno
 * ya estaba inscrito.
 *
 * @param {string|number} userId
 * @param {string|number} routeId  Ruta de Turso; de ella se saca el `subjectId`.
 * @returns {Promise<boolean>} `true` si se sincronizó.
 */
export const syncEnrollmentToGraph = async (userId, routeId) => {
  const driver = getDriver();
  if (!driver) return false;

  const parsedRouteId = parseInt(routeId, 10);
  if (!Number.isInteger(parsedRouteId)) return false;

  const routeResult = await turso.execute({
    sql: `SELECT subjectId FROM LearningRoute WHERE id = ?`,
    args: [parsedRouteId]
  });

  const subjectId = routeResult.rows[0]?.subjectId;
  if (!subjectId) return false;

  const session = getSession(driver);
  try {
    // `MATCH` y no `MERGE`: el `Subject` es un nodo curricular sembrado. Con
    // `MERGE` se creaba un `Subject` fantasma (sin `name`) si el `subjectId`
    // no existía, y `getSubjectsWithCounts` lo devolvía con `name: null`.
    await session.run(
      `MERGE (u:User {tursoId: $userId})
       MATCH (s:Subject {id: $subjectId})
       MERGE (u)-[:ENROLLED_IN]->(s)`,
      { userId: userId.toString(), subjectId }
    );
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando la inscripción al grafo:', error.message);
    return false;
  } finally {
    await session.close();
  }
};

/**
 * Temas curriculares que cubre un `Module` runtime de una ruta.
 *
 * Es el puente que activa el GraphRAG del chat: el frontend manda el módulo
 * (no conoce los ids de los temas) y el grafo resuelve cuáles son.
 *
 * @param {string|number} routeId    Id de la ruta en Turso (propiedad `routeId` del `Module`).
 * @param {string} moduleTitle       Título del módulo runtime.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export const getModuleTopicsForChat = async (routeId, moduleTitle) => {
  const driver = getDriver();
  if (!driver || !moduleTitle || routeId === null || routeId === undefined) return [];

  const session = getSession(driver);
  try {
    const result = await session.run(
      `MATCH (m:Module {title: $moduleTitle, routeId: $routeId})-[:CONTAINS_TOPIC]->(t:Topic)
       RETURN t.id AS id, t.name AS name
       ORDER BY t.id ASC`,
      { moduleTitle, routeId: String(routeId) }
    );

    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name')
    }));
  } catch (error) {
    console.error('❌ Error obteniendo temas del módulo para el chat:', error.message);
    return [];
  } finally {
    await session.close();
  }
};

/**
 * Temas curriculares de un módulo de Turso (por su id de base de datos).
 *
 * El frontend no conoce los ids de los temas: los pide al grafo, que es quien
 * sabe qué temas cubre cada módulo. Es el puente que permite al chat enviar
 * un `topicId` real y activar el GraphRAG.
 *
 * @param {string|number} moduleId  Id de `Module` en Turso.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export const getModuleTopicsByModuleId = async (moduleId) => {
  const parsedModuleId = parseInt(moduleId, 10);
  if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) return [];

  const modResult = await turso.execute({
    sql: `SELECT id, title, routeId FROM Module WHERE id = ?`,
    args: [parsedModuleId]
  });

  if (!modResult.rows.length) return [];

  const mod = modResult.rows[0];
  return getModuleTopicsForChat(mod.routeId, mod.title);
};

/**
 * Recomendaciones cruzadas entre materias según progreso
 */
export const getCrossCurricularRecommendations = async (userId) => {
  const driver = getDriver();
  if (!driver) return [];

  const session = getSession(driver);
  try {
    // Materias en las que el alumno ya está inscrito (Turso es la fuente de
    // verdad; `ENROLLED_IN` es la caché del grafo).
    const enrolledSubjectIds = await getEnrolledSubjectIds(userId);

    const result = await session.run(`
      MATCH (u:User {tursoId: $userId})-[c:COMPLETED]->(t:Topic)
      MATCH (s:Subject)-[:HAS_MODULE]->(:Module)-[:CONTAINS_TOPIC]->(t)
      MATCH (s)-[sim:SIMILAR_TO]->(target:Subject)
      WHERE NOT (u)-[:ENROLLED_IN]->(target)
        AND NOT target.id IN $enrolledSubjectIds
        AND s.id <> target.id
      RETURN DISTINCT target.id AS id,
             target.name AS name,
             target.description AS description,
             sim.score AS matchScore,
             sim.reason AS reason
      ORDER BY sim.score DESC
      LIMIT 3
    `, {
      userId: userId.toString(),
      enrolledSubjectIds
    });

    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      description: record.get('description'),
      // BUG 3: en la BD el score es 0-1 y el contrato es 0-100.
      matchScore: normalizeAffinityScore(record.get('matchScore')),
      reason: record.get('reason')
    }));
  } catch (error) {
    console.error('❌ Error obteniendo recomendaciones cruzadas:', error.message);
    return [];
  } finally {
    await session.close();
  }
};
