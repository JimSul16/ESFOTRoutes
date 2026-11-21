import { turso } from '../config/turso.js';
import { syncRouteToGraph, deleteRouteFromGraph, markModuleAsCompleted, markModuleStruggle } from '../services/neo4j.service.js';
import { syncEnrollmentToGraph } from '../services/knowledgeGraph.service.js';
import { executeWithGeminiCascade } from '../services/chat.service.js';
import { parseId } from '../utils/index.js';
import { assertRouteAccess, sendAccessError } from '../services/routeAccess.service.js';
import { getRouteProgress, syncEnrollmentProgress } from '../services/routeProgress.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte el `:id` de la URL en un entero de ruta válido.
 *
 * `parseInt('abc')` devuelve `NaN`, y Turso/libSQL no puede enlazar `NaN`:
 * la consulta reventaba y el endpoint respondía 500 en lugar de 400.
 *
 * @returns {number|null} El id, o `null` si no es un entero válido.
 */
const parseRouteId = (raw) => parseId(raw);

// Materias del grafo de conocimiento (id en Neo4j → nombre legible).
const SUBJECT_NAMES = {
  redes: 'Redes de Computadoras',
  web: 'Desarrollo de Aplicaciones Web',
};

/**
 * Deduce el `subjectId` de una ruta a partir de su `category`.
 * Permite que las rutas creadas a mano desde el panel de admin queden
 * relacionables con el grafo sin pedir un campo extra en el formulario.
 */
const inferSubjectId = (category) => {
  if (!category) return null;

  const normalized = String(category).trim().toLowerCase();
  const entry = Object.entries(SUBJECT_NAMES).find(
    ([, name]) => name.toLowerCase() === normalized
  );

  return entry ? entry[0] : null;
};

/**
 * Construye el objeto completo de una ruta con sus módulos y recursos.
 * Si se pasa userId, incluye el estado de completitud de cada módulo
 * (isPassed, passedTheory, passedPractice, score) y `openedResourceIds`.
 */
const buildFullRoute = async (routeId, userId = null) => {
  const routeResult = await turso.execute({
    sql: `SELECT * FROM LearningRoute WHERE id = ?`,
    args: [routeId]
  });
  if (!routeResult.rows.length) return null;

  const route = routeResult.rows[0];

  const modulesResult = await turso.execute({
    sql: `SELECT * FROM Module WHERE routeId = ? ORDER BY position ASC`,
    args: [routeId]
  });

  let progressMap = {};
  let openedResourceIds = [];
  if (userId) {
    const progressResult = await turso.execute({
      sql: `SELECT mp.moduleId, mp.isPassed, mp.passedTheory, mp.passedPractice, mp.score
            FROM ModuleProgress mp
            JOIN Module m ON m.id = mp.moduleId
            WHERE mp.userId = ? AND m.routeId = ?`,
      args: [userId, routeId]
    });
    for (const row of progressResult.rows) {
      progressMap[row.moduleId] = {
        isPassed: Boolean(row.isPassed),
        passedTheory: Boolean(row.passedTheory),
        passedPractice: Boolean(row.passedPractice),
        score: row.score
      };
    }

    const openedResult = await turso.execute({
      sql: `SELECT DISTINCT ra.resourceId
            FROM ResourceAccess ra
            JOIN ModuleResource mr ON mr.resourceId = ra.resourceId
            JOIN Module m ON m.id = mr.moduleId
            WHERE ra.userId = ? AND m.routeId = ?`,
      args: [userId, routeId]
    });
    openedResourceIds = openedResult.rows.map((r) => String(r.resourceId));
  }

  // Una sola consulta de recursos para toda la ruta (antes: una por módulo).
  const resourcesResult = await turso.execute({
    sql: `SELECT mr.moduleId AS _moduleId, mr.position, r.* FROM ModuleResource mr
          JOIN Resource r ON r.id = mr.resourceId
          JOIN Module m ON m.id = mr.moduleId
          WHERE m.routeId = ? ORDER BY mr.position ASC`,
    args: [routeId]
  });
  const resourcesByModule = {};
  for (const { _moduleId, ...resource } of resourcesResult.rows) {
    (resourcesByModule[_moduleId] ||= []).push(resource);
  }

  const modules = modulesResult.rows.map((mod) => {
    const modProgress = progressMap[mod.id] || {
      isPassed: false, passedTheory: false, passedPractice: false, score: null
    };
    return {
      ...mod,
      isPassed: modProgress.isPassed,
      passedTheory: modProgress.passedTheory,
      passedPractice: modProgress.passedPractice,
      score: modProgress.score,
      resources: resourcesByModule[mod.id] || []
    };
  });

  return {
    ...route,
    modules,
    ...(userId !== null ? { openedResourceIds } : {})
  };
};

// ─── Controladores ────────────────────────────────────────────────────────────

export const createRoute = async (req, res) => {
  try {
    const { title, description, category, estimatedTime, difficulty, evaluationRules, modules, imageUrl, subjectId } = req.body;
    const authorId = req.user.id;

    if (!title) return res.status(400).json({ error: 'El título es obligatorio.' });

    // `lastInsertRowid` en vez de `SELECT ... ORDER BY id DESC LIMIT 1`: la
    // relectura devolvía el id equivocado con dos peticiones simultáneas.
    const routeInsert = await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, subjectId, imageUrl, estimatedTime, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [title, description || null, category || null,
             subjectId || inferSubjectId(category),
             imageUrl || null,
             estimatedTime ? parseInt(estimatedTime) : null,
             difficulty || 'BEGINNER', evaluationRules || null, authorId]
    });
    const routeId = Number(routeInsert.lastInsertRowid);

    if (modules?.length) {
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        const modInsert = await turso.execute({
          sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
          args: [mod.title, mod.description || null, i + 1, routeId]
        });
        const moduleId = Number(modInsert.lastInsertRowid);

        if (mod.resourceIds?.length) {
          for (let j = 0; j < mod.resourceIds.length; j++) {
            await turso.execute({
              sql: `INSERT OR IGNORE INTO ModuleResource (moduleId, resourceId, position) VALUES (?, ?, ?)`,
              args: [moduleId, parseInt(mod.resourceIds[j]), j + 1]
            });
          }
        }
      }
    }

    const fullRoute = await buildFullRoute(routeId);
    // Sincronizar al Grafo de Conocimiento. Se espera: sin `await` la
    // respuesta HTTP salía antes de que el grafo estuviera sincronizado y
    // un fallo del grafo pasaba desapercibido.
    await syncRouteToGraph(routeId, title, category, fullRoute?.modules || []);

    return res.status(201).json({ message: 'Ruta de aprendizaje creada exitosamente', route: fullRoute });
  } catch (error) {
    console.error('Error en createRoute:', error);
    return res.status(500).json({ error: 'Error al crear la ruta.' });
  }
};

export const getRoutes = async (req, res) => {
  try {
    const routesResult = await turso.execute(
      `SELECT * FROM LearningRoute WHERE isPublic = 1 ORDER BY createdAt DESC`
    );

    const routes = await Promise.all(routesResult.rows.map(r => buildFullRoute(r.id)));
    return res.json(routes);
  } catch (error) {
    console.error('Error en getRoutes:', error);
    return res.status(500).json({ error: 'Error al obtener las rutas' });
  }
};

export const getRouteById = async (req, res) => {
  try {
    const userId = req.user.id;
    const routeId = parseRouteId(req.params.id);
    if (routeId === null) {
      return res.status(400).json({ error: 'El identificador de la ruta no es válido.' });
    }

    // Antes no había ningún chequeo: cualquier estudiante leía la ruta
    // privada de otro (módulos, recursos y `evaluationRules`) por su id.
    const access = await assertRouteAccess(userId, routeId);

    const route = await buildFullRoute(routeId, userId);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });

    // `progress` solo tiene sentido para quien está inscrito; sin él, el
    // detalle del frontend perdía el valor que traía de `my-routes`.
    if (access.isEnrolled) {
      route.progress = await getRouteProgress(userId, routeId);
    }
    return res.json(route);
  } catch (error) {
    if (sendAccessError(res, error)) return;
    console.error('Error en getRouteById:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener la ruta' });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    const routeId = parseRouteId(req.params.id);
    if (routeId === null) {
      return res.status(400).json({ error: 'El identificador de la ruta no es válido.' });
    }

    const existing = await turso.execute({ sql: `SELECT id FROM LearningRoute WHERE id = ?`, args: [routeId] });
    if (!existing.rows.length) return res.status(404).json({ error: 'Ruta no encontrada.' });

    await turso.execute({ sql: `DELETE FROM LearningRoute WHERE id = ?`, args: [routeId] });
    await deleteRouteFromGraph(routeId);

    return res.status(200).json({ message: 'Ruta eliminada correctamente.' });
  } catch (error) {
    console.error('Error en deleteRoute:', error);
    return res.status(500).json({ error: 'Error al eliminar la ruta.' });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const routeId = parseRouteId(req.params.id);
    if (routeId === null) {
      return res.status(400).json({ error: 'El identificador de la ruta no es válido.' });
    }
    const { title, description, category, estimatedTime, difficulty, evaluationRules, modules, imageUrl, subjectId } = req.body;

    const existing = await turso.execute({ sql: `SELECT id FROM LearningRoute WHERE id = ?`, args: [routeId] });
    if (!existing.rows.length) return res.status(404).json({ error: 'Ruta no encontrada.' });

    await turso.execute({
      sql: `UPDATE LearningRoute SET title=?, description=?, category=?, subjectId=?, imageUrl=?,
            estimatedTime=?, difficulty=?, evaluationRules=?, updatedAt=datetime('now') WHERE id=?`,
      args: [title, description || null, category || null,
             subjectId || inferSubjectId(category),
             imageUrl || null,
             estimatedTime ? parseInt(estimatedTime) : null,
             difficulty || 'BEGINNER', evaluationRules || null, routeId]
    });

    if (modules) {
      // ── Actualización de módulos SIN perder el progreso de los alumnos ──────
      // Antes se hacía `DELETE FROM Module WHERE routeId = ?` y se reinsertaba
      // todo. Como `ModuleProgress`, `ModuleAssessment` y `ModuleResource`
      // tienen `ON DELETE CASCADE`, ese borrado **destruía el progreso de
      // todos los estudiantes** que cursaban la ruta (verificado en ejecución:
      // `ModuleProgress` 1 → 0).
      //
      // Ahora: se conservan los módulos existentes (emparejando por `id`),
      // se actualizan o se insertan los nuevos, y solo se borran los que
      // desaparecen **y** no tienen progreso de ningún alumno.
      const existingModules = await turso.execute({
        sql: `SELECT id, title, description, position FROM Module WHERE routeId = ? ORDER BY position ASC`,
        args: [routeId]
      });

      const keptIds = new Set();

      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        const position = i + 1;
        // El panel de admin no manda `id` (el tipo `RouteModuleInput` no lo
        // tiene), así que se empareja también por título: así el módulo
        // conserva su id y el progreso de los alumnos.
        const existing =
          existingModules.rows.find((m) => m.id === mod.id) ??
          existingModules.rows.find((m) => m.title === mod.title && !keptIds.has(m.id));

        let moduleId;
        if (existing) {
          // Se actualiza en el sitio: el `id` se conserva y con él el
          // `ModuleProgress` de los alumnos.
          await turso.execute({
            sql: `UPDATE Module SET title = ?, description = ?, position = ?, updatedAt = datetime('now') WHERE id = ?`,
            args: [mod.title, mod.description || null, position, existing.id]
          });
          moduleId = existing.id;
        } else {
          await turso.execute({
            sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
            args: [mod.title, mod.description || null, position, routeId]
          });
          const modResult = await turso.execute({
            sql: `SELECT id FROM Module WHERE routeId = ? AND position = ? LIMIT 1`,
            args: [routeId, position]
          });
          moduleId = modResult.rows[0]?.id;
        }

        keptIds.add(moduleId);

        if (moduleId && mod.resourceIds?.length) {
          for (let j = 0; j < mod.resourceIds.length; j++) {
            await turso.execute({
              sql: `INSERT OR IGNORE INTO ModuleResource (moduleId, resourceId, position) VALUES (?, ?, ?)`,
              args: [moduleId, parseInt(mod.resourceIds[j]), j + 1]
            });
          }
        }
      }

      // Los módulos que han desaparecido de la edición solo se borran si
      // ningún alumno tiene progreso en ellos: si lo tienen, se conservan
      // (y quedan "huérfanos" de la edición, pero sin perder el trabajo).
      for (const old of existingModules.rows) {
        if (keptIds.has(old.id)) continue;

        const withProgress = await turso.execute({
          sql: `SELECT COUNT(*) AS total FROM ModuleProgress WHERE moduleId = ?`,
          args: [old.id]
        });

        if (Number(withProgress.rows[0]?.total || 0) === 0) {
          await turso.execute({ sql: `DELETE FROM Module WHERE id = ?`, args: [old.id] });
        } else {
          console.warn(
            `⚠️  Módulo ${old.id} ("${old.title}") conservado: tiene progreso de alumnos y ya no está en la edición.`
          );
        }
      }
    }

    const updatedRoute = await buildFullRoute(routeId);
    // El grafo puede tener módulos de la versión anterior de la ruta: se
    // borran antes de re-sincronizar para que no queden obsoletos.
    await deleteRouteFromGraph(routeId);
    await syncRouteToGraph(routeId, title, category, updatedRoute?.modules || []);

    return res.status(200).json({ message: 'Ruta actualizada', route: updatedRoute });
  } catch (error) {
    console.error('Error en updateRoute:', error);
    return res.status(500).json({ error: 'Error al actualizar la ruta.' });
  }
};

export const generatePersonalizedRoute = async (req, res) => {
  try {
    const { topic, difficulty, additionalContext, subjectId } = req.body;
    const authorId   = req.user.id;
    const uploadedFile = req.file;

    if (!topic) return res.status(400).json({ error: 'El tema es obligatorio para generar la ruta.' });

    const systemPrompt = `
      Eres un experto diseñador curricular de software de la Escuela Politécnica Nacional.
      El estudiante solicita aprender sobre: "${topic}".
      Nivel de dificultad exigido: "${difficulty}".
      Contexto adicional proporcionado: "${additionalContext || 'Ninguno'}".

      Instrucciones estrictas:
      1. Diseña una Ruta de Aprendizaje completa y estructurada en módulos.
      2. DEBES incluir recursos educativos reales para CADA módulo.
      3. El campo "evaluationRules" será el PROMPT MAESTRO para evaluar a este estudiante en el futuro.
      4. Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:

      {
        "title": "Un título atractivo",
        "description": "Una descripción clara",
        "evaluationRules": "Reglas estrictas de evaluación",
        "modules": [
          {
            "title": "Nombre del módulo",
            "description": "Descripción detallada",
            "resources": [
              {
                "title": "Nombre del recurso",
                "url": "https://enlace-real.com",
                "type": "LINK"
              }
            ]
          }
        ]
      }
    `;

    const promptParts = [systemPrompt];

    if (uploadedFile) {
      promptParts.push({
        inlineData: { data: uploadedFile.buffer.toString('base64'), mimeType: uploadedFile.mimetype }
      });
    }

    const parsedData = await executeWithGeminiCascade(async ({ genAI, modelName }) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptParts);
      let aiResponse = result.response.text().trim();
      aiResponse = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(aiResponse);
    });

    // Insertar Ruta (privada: solo la ve su autor)
    // `subjectId` es opcional: si no viene, se deduce de la categoría que
    // devuelva la IA. Antes se leía una variable `category` inexistente en
    // este ámbito: ReferenceError (500) si no llegaba `subjectId`.
    const routeInsert = await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, subjectId, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, 'Generada por IA', ?, ?, ?, ?, 0)`,
      args: [parsedData.title, parsedData.description,
             subjectId || inferSubjectId(parsedData.category),
             difficulty || 'INTERMEDIATE', parsedData.evaluationRules, authorId]
    });
    const routeId = Number(routeInsert.lastInsertRowid);

    // Insertar módulos y recursos
    for (let i = 0; i < parsedData.modules.length; i++) {
      const mod = parsedData.modules[i];
      const modInsert = await turso.execute({
        sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
        args: [mod.title, mod.description || null, i + 1, routeId]
      });
      const moduleId = Number(modInsert.lastInsertRowid);

      if (mod.resources?.length) {
        for (let j = 0; j < mod.resources.length; j++) {
          const res = mod.resources[j];
          const resInsert = await turso.execute({
            sql: `INSERT INTO Resource (title, url, type, authorId) VALUES (?, ?, ?, ?)`,
            args: [res.title, res.url, res.type || 'LINK', authorId]
          });
          await turso.execute({
            sql: `INSERT OR IGNORE INTO ModuleResource (moduleId, resourceId, position) VALUES (?, ?, ?)`,
            args: [moduleId, Number(resInsert.lastInsertRowid), j + 1]
          });
        }
      }
    }

    // Matrícula automática: sin ella el autor veía la ruta en "Mis Rutas"
    // pero `completeModule` le respondía 403 (no inscrito).
    await turso.execute({
      sql: `INSERT OR IGNORE INTO Enrollment (userId, learningRouteId, progress) VALUES (?, ?, 0)`,
      args: [authorId, routeId]
    });

    const fullRoute = await buildFullRoute(routeId);
    await syncRouteToGraph(routeId, parsedData.title, 'Generada por IA', fullRoute?.modules || []);
    await syncEnrollmentToGraph(authorId, routeId);

    return res.status(201).json({ message: 'Ruta IA generada exitosamente', route: fullRoute });
  } catch (error) {
    console.error('Error en generatePersonalizedRoute:', error);
    return res.status(500).json({ error: 'Fallo al generar la ruta personalizada con IA.' });
  }
};

export const getMyRoutes = async (req, res) => {
  try {
    const userId = req.user.id;

    // Rutas en las que está inscrito
    const enrolledResult = await turso.execute({
      sql: `SELECT lr.id, e.id AS enrollmentId, e.createdAt AS enrolledAt
            FROM LearningRoute lr
            JOIN Enrollment e ON e.learningRouteId = lr.id
            WHERE e.userId = ?`,
      args: [userId]
    });

    // Rutas que creó (privadas)
    const authoredResult = await turso.execute({
      sql: `SELECT id FROM LearningRoute WHERE authorId = ? AND isPublic = 0`,
      args: [userId]
    });

    // Unir por id: la misma ruta puede salir por ambas consultas
    const byId = new Map();

    for (const row of enrolledResult.rows) {
      byId.set(row.id, { id: row.id, enrollmentId: row.enrollmentId, enrolledAt: row.enrolledAt });
    }

    for (const row of authoredResult.rows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, { id: row.id, enrollmentId: null, enrolledAt: null });
      }
    }

    const routes = await Promise.all(
      [...byId.values()].map(async ({ id, enrollmentId, enrolledAt }) => {
        // `userId` es imprescindible: sin él `buildFullRoute` no puebla
        // `isPassed`/`score` de cada módulo y el panel de analítica cuenta
        // 0 módulos completados aunque el alumno los haya aprobado.
        const route = await buildFullRoute(id, userId);
        if (!route) return null;

        return {
          ...route,
          // Antes no se devolvía nada de progreso: el frontend leía
          // `enrollments[0].progress` y siempre obtenía 0.
          progress: await getRouteProgress(userId, id),
          enrollments: enrollmentId
            ? [{ id: enrollmentId, routeId: id, enrolledAt }]
            : [],
        };
      })
    );

    return res.json(routes.filter(Boolean));
  } catch (error) {
    console.error('Error en getMyRoutes:', error);
    return res.status(500).json({ error: 'Error al obtener tus rutas.' });
  }
};

export const enrollRoute = async (req, res) => {
  try {
    const userId  = req.user.id;
    const routeId = parseRouteId(req.params.id);

    // LIM-03: antes, enrolarse en una ruta inexistente reventaba con un 500
    // por violación de la FK de Turso. Ahora se responde 404.
    if (routeId === null) {
      return res.status(400).json({ error: 'El identificador de la ruta no es válido.' });
    }

    const routeExists = await turso.execute({
      sql: `SELECT id, isPublic, authorId FROM LearningRoute WHERE id = ?`,
      args: [routeId]
    });
    if (!routeExists.rows.length) {
      return res.status(404).json({ error: 'Ruta no encontrada.' });
    }

    // Las rutas privadas solo son visibles para quien las creó. Antes se
    // permitían a cualquiera que conociera el id (el alumno no las ve en el
    // catálogo, pero podía inscribirse y el endpoint devolvía 201).
    const route = routeExists.rows[0];
    const isPublic = Boolean(route.isPublic);
    const isAuthor = Number(route.authorId) === Number(userId);
    if (!isPublic && !isAuthor) {
      return res.status(403).json({ error: 'No puedes inscribirte en una ruta privada.' });
    }

    const existing = await turso.execute({
      sql: `SELECT id FROM Enrollment WHERE userId = ? AND learningRouteId = ?`,
      args: [userId, routeId]
    });

    if (existing.rows.length) {
      return res.status(400).json({ message: 'Ya estás inscrito en esta ruta.', enrolled: true });
    }

    await turso.execute({
      sql: `INSERT INTO Enrollment (userId, learningRouteId) VALUES (?, ?)`,
      args: [userId, routeId]
    });

    // Reflejar la inscripción en el grafo (`ENROLLED_IN`): sin esta relación
    // las recomendaciones cruzadas ofrecían la materia en la que el alumno
    // ya estaba inscrito.
    await syncEnrollmentToGraph(userId, routeId);

    const result = await turso.execute({
      sql: `SELECT * FROM Enrollment WHERE userId = ? AND learningRouteId = ?`,
      args: [userId, routeId]
    });

    return res.status(201).json({ message: 'Inscripción exitosa.', enrollment: result.rows[0], enrolled: true });
  } catch (error) {
    console.error('Error en enrollRoute:', error);
    return res.status(500).json({ error: 'Error al inscribirse en la ruta.' });
  }
};

/** Respuesta "sin cambios" con todos los alias (RR-004). */
const unchangedProgressResponse = async (userId, routeId, extra) => {
  const progress = await getRouteProgress(userId, routeId);
  const currentUser = await turso.execute({
    sql: `SELECT xp, level FROM User WHERE id = ?`,
    args: [userId]
  });
  const totalXp    = currentUser.rows[0]?.xp || 0;
  const totalLevel = currentUser.rows[0]?.level || Math.floor(totalXp / 1000) + 1;
  return {
    progress,
    xpGained: 0,
    newTotalXp: totalXp,
    newLevel: totalLevel,
    // Alias en español: el frontend renombra "XP" → "progreso" (RR-004).
    pointsGained: 0,
    newTotalProgress: totalXp,
    newProgressLevel: totalLevel,
    ...extra
  };
};

const ASSESSMENT_TYPES = ['teoria', 'completa', 'practica'];

export const completeModule = async (req, res) => {
  try {
    const { moduleId, score, passed, assessmentType = 'teoria' } = req.body;
    const userId = req.user.id;
    const modId  = parseInt(moduleId, 10);

    // Un `moduleId` no numérico no puede enlazarse en Turso (NaN) y provocaba
    // un 500 en lugar de un 400 con mensaje claro.
    if (!Number.isInteger(modId) || modId <= 0) {
      return res.status(400).json({ error: 'El identificador del módulo no es válido.' });
    }

    if (!ASSESSMENT_TYPES.includes(assessmentType)) {
      return res.status(400).json({
        error: 'El tipo de evaluación no es válido. Use "teoria", "completa" o "practica".'
      });
    }

    // Obtener routeId, title y si es el último módulo de la ruta
    const moduleData = await turso.execute({
      sql: `SELECT m.routeId, m.title,
                   m.position = (SELECT MAX(position) FROM Module WHERE routeId = m.routeId) AS isLast
            FROM Module m WHERE m.id = ?`,
      args: [modId]
    });
    if (!moduleData.rows.length) {
      return res.status(404).json({ error: 'Módulo no encontrado.' });
    }
    const routeId = moduleData.rows[0].routeId;
    const moduleTitle = moduleData.rows[0].title;
    const isLastModule = Boolean(moduleData.rows[0].isLast);

    // ── Autorización: el alumno debe estar inscrito en la ruta ─────────────
    // Antes no se comprobaba: cualquier STUDENT autenticado podía aprobar
    // módulos de cualquier ruta (verificado: +50 XP y `ModuleProgress` creado
    // sin inscripción previa).
    const enrollment = await turso.execute({
      sql: `SELECT id FROM Enrollment WHERE userId = ? AND learningRouteId = ?`,
      args: [userId, routeId]
    });

    if (!enrollment.rows.length) {
      return res.status(403).json({
        error: 'No estás inscrito en esta ruta. Inscríbete antes de registrar tu progreso.'
      });
    }

    // El reto final solo existe en el último módulo: el cálculo de progreso
    // cuenta un único reto (N cuestionarios + 1), así que aceptarlo en otros
    // módulos inflaba el avance.
    if (assessmentType === 'completa' && !isLastModule) {
      return res.status(400).json({ error: 'El reto final solo está disponible en el último módulo de la ruta.' });
    }

    const existingProgress = await turso.execute({
      sql: `SELECT id, isPassed, passedTheory, passedPractice FROM ModuleProgress
            WHERE userId = ? AND moduleId = ?`,
      args: [userId, modId]
    });
    const existing = existingProgress.rows[0];
    const moduleAlreadyPassed = Boolean(existing?.isPassed);

    // La práctica es formativa: se acepta (el cliente la tiene tipada) pero
    // no suma progreso ni XP.
    if (assessmentType === 'practica') {
      return res.status(200).json(await unchangedProgressResponse(userId, routeId, {
        message: 'La práctica es formativa: no suma al progreso de la ruta.',
        assessmentType,
        passed: Boolean(passed)
      }));
    }

    // ── Una evaluación ya aprobada no se vuelve a contar ──────────────────
    // La guarda es por tipo: aprobar el cuestionario no bloquea el reto final.
    // Una fila previa a los flags (`isPassed` sin ningún tipo) cuenta como
    // cuestionario aprobado, igual que el backfill de `migrate.js`.
    const legacyTheory = moduleAlreadyPassed && !existing.passedTheory && !existing.passedPractice;
    const alreadyPassedThisType = existing && (
      (assessmentType === 'teoria'   && (Boolean(existing.passedTheory) || legacyTheory)) ||
      (assessmentType === 'completa' && Boolean(existing.passedPractice))
    );

    if (alreadyPassedThisType) {
      return res.status(200).json(await unchangedProgressResponse(userId, routeId, {
        message: 'Esta evaluación ya fue aprobada anteriormente.',
        assessmentType,
        passed: true
      }));
    }

    if (!passed || (score !== undefined && score < 70)) {
      // Un módulo ya aprobado no se marca como dificultad: antes eso dejaba
      // el `Topic` con `COMPLETED` y `STRUGGLES_WITH` a la vez (el tema
      // superado acababa marcado como "⚡ Refuerzo").
      if (!moduleAlreadyPassed) {
        await markModuleStruggle(userId, routeId, moduleTitle, score || 0, 'Reprobó evaluación de módulo');
      }
      return res.status(200).json({
        message: 'Progreso registrado. Sigue practicando para aprobar el módulo. Se reforzarán estos conceptos.',
        assessmentType,
        passed: false,
        score: score || 0,
        progress: await getRouteProgress(userId, routeId),
      });
    }

    // Progreso + XP en un solo lote atómico: antes eran escrituras sueltas y
    // un fallo a mitad dejaba el progreso guardado sin la XP (o al revés).
    const isTheory   = assessmentType === 'teoria'   ? 1 : 0;
    const isPractice = assessmentType === 'completa' ? 1 : 0;
    await turso.batch([
      {
        sql: `INSERT INTO ModuleProgress (userId, moduleId, isPassed, passedTheory, passedPractice, score)
              VALUES (?, ?, 1, ?, ?, ?)
              ON CONFLICT(userId, moduleId) DO UPDATE SET
                isPassed       = 1,
                passedTheory   = MAX(passedTheory,   excluded.passedTheory),
                passedPractice = MAX(passedPractice, excluded.passedPractice),
                score          = MAX(COALESCE(score, 0), excluded.score)`,
        args: [userId, modId, isTheory, isPractice, score || 100]
      },
      {
        sql: `UPDATE User SET xp = xp + 50, level = ((xp + 50) / 1000) + 1 WHERE id = ?`,
        args: [userId]
      }
    ], 'write');

    // Guardar en el Grafo Neo4j (solo la primera vez que se supera el módulo)
    if (!moduleAlreadyPassed) {
      await markModuleAsCompleted(userId, routeId, moduleTitle, score || 100);
    }

    // Mismo helper que `GET /routes/my-routes`: el valor guardado y el
    // devuelto nunca divergen.
    const [{ progress }] = await syncEnrollmentProgress(userId, [routeId]);

    const userResult = await turso.execute({ sql: `SELECT xp, level FROM User WHERE id = ?`, args: [userId] });
    const newXp    = Number(userResult.rows[0]?.xp || 0);
    const newLevel = Number(userResult.rows[0]?.level || 1);

    return res.status(200).json({
      message: assessmentType === 'completa' ? 'Reto final aprobado con éxito.' : 'Módulo completado con éxito.',
      assessmentType,
      passed: true,
      progress,
      xpGained: 50,
      newTotalXp: newXp,
      newLevel,
      // ── Alias "progreso" (RR-004) ──────────────────────────────────────
      // Mismos valores con el vocabulario nuevo del frontend:
      // "XP" → puntos de progreso, "level" → nivel de progreso.
      pointsGained: 50,
      newTotalProgress: newXp,
      newProgressLevel: newLevel
    });
  } catch (error) {
    console.error('Error en completeModule:', error);
    return res.status(500).json({ error: 'Error al registrar el progreso.' });
  }
};

/**
 * Evaluaciones generadas de un módulo (RR-008).
 * GET /api/routes/modules/:moduleId/assessments
 *
 * La tabla `ModuleAssessment` ya guardaba los exámenes generados, pero no
 * había ninguna forma de listarlos: solo se podían volver a pedir con
 * `POST /api/chat/assessment`. Devuelve el listado (con `content` parseado)
 * para que el frontend pueda mostrar el historial de evaluaciones del módulo.
 */
export const getModuleAssessments = async (req, res) => {
  try {
    const modId = parseId(req.params.moduleId);
    if (modId === null) {
      return res.status(400).json({ error: 'El identificador del módulo no es válido.' });
    }

    const moduleData = await turso.execute({
      sql: `SELECT id, title, routeId FROM Module WHERE id = ?`,
      args: [modId]
    });
    if (!moduleData.rows.length) {
      return res.status(404).json({ error: 'Módulo no encontrado.' });
    }

    // Los exámenes incluyen la clave de respuestas: solo para quien puede
    // ver la ruta (antes se listaban los de cualquier ruta privada).
    await assertRouteAccess(req.user.id, moduleData.rows[0].routeId);

    const result = await turso.execute({
      sql: `SELECT id, moduleId, type, content, createdAt, updatedAt
            FROM ModuleAssessment WHERE moduleId = ?
            ORDER BY updatedAt DESC`,
      args: [modId]
    });

    const assessments = result.rows.map((row) => {
      let content = row.content;
      try {
        content = JSON.parse(row.content);
      } catch (_) {
        // `content` no es JSON válido: se devuelve tal cual (texto plano).
      }
      return { ...row, content };
    });

    return res.json({
      module: { id: moduleData.rows[0].id, title: moduleData.rows[0].title, routeId: moduleData.rows[0].routeId },
      assessments,
      total: assessments.length
    });
  } catch (error) {
    if (sendAccessError(res, error)) return;
    console.error('Error en getModuleAssessments:', error);
    return res.status(500).json({ error: 'Error al obtener las evaluaciones del módulo.' });
  }
};

/**
 * Registra que el alumno abrió un recurso.
 * POST /api/routes/resources/:id/open
 *
 * Idempotente (`INSERT OR IGNORE`): el mismo recurso no suma dos veces. Solo
 * se aceptan recursos de rutas en las que el alumno está inscrito. Como el
 * progreso ahora depende de los recursos abiertos, se recalcula el valor
 * cacheado en `Enrollment.progress` (lo leen el perfil, el panel de admin y
 * el prompt del tutor) y se devuelve para que el cliente no recalcule la
 * fórmula.
 *
 * Un recurso compartido por varias rutas cuenta como abierto en todas.
 */
export const openResource = async (req, res) => {
  try {
    const userId     = req.user.id;
    const resourceId = parseId(req.params.id);

    if (resourceId === null) {
      return res.status(400).json({ error: 'El identificador del recurso no es válido.' });
    }

    const routesResult = await turso.execute({
      sql: `SELECT DISTINCT m.routeId
            FROM ModuleResource mr
            JOIN Module m ON m.id = mr.moduleId
            JOIN Enrollment e ON e.learningRouteId = m.routeId AND e.userId = ?
            WHERE mr.resourceId = ?`,
      args: [userId, resourceId]
    });

    // Mismo 404 para "no existe" y "no está en tus rutas": no revela qué ids
    // de recurso existen.
    if (!routesResult.rows.length) {
      return res.status(404).json({ error: 'Recurso no encontrado en tus rutas inscritas.' });
    }

    const insert = await turso.execute({
      sql: `INSERT OR IGNORE INTO ResourceAccess (userId, resourceId) VALUES (?, ?)`,
      args: [userId, resourceId]
    });

    const routeIds = routesResult.rows.map((r) => Number(r.routeId));
    const progressByRoute = insert.rowsAffected > 0
      ? await syncEnrollmentProgress(userId, routeIds)
      : await Promise.all(routeIds.map(async (routeId) => ({
          routeId,
          progress: await getRouteProgress(userId, routeId)
        })));

    return res.status(200).json({
      message: 'Recurso registrado como abierto.',
      resourceId,
      firstOpen: insert.rowsAffected > 0,
      progressByRoute
    });
  } catch (error) {
    console.error('Error en openResource:', error);
    return res.status(500).json({ error: 'Error al registrar el recurso abierto.' });
  }
};
