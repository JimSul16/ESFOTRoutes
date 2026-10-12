import { GoogleGenerativeAI } from '@google/generative-ai';
import { turso } from '../config/turso.js';
import { syncRouteToGraph, deleteRouteFromGraph, markModuleAsCompleted } from '../services/neo4j.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 * Calcula el avance de un usuario sobre una ruta: módulos superados sobre
 * módulos totales, en porcentaje entero (0 si la ruta no tiene módulos).
 *
 * Se apoya en `ModuleProgress.isPassed`, que es lo que escribe
 * `completeModule` cuando el alumno aprueba la evaluación.
 */
const getRouteProgress = async (userId, routeId) => {
  const result = await turso.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM Module WHERE routeId = ?) AS totalModules,
            (SELECT COUNT(*) FROM ModuleProgress mp
               JOIN Module m ON m.id = mp.moduleId
              WHERE mp.userId = ? AND m.routeId = ? AND mp.isPassed = 1) AS completedModules`,
    args: [routeId, userId, routeId]
  });

  const { totalModules, completedModules } = result.rows[0] || {};

  if (!totalModules) return 0;
  return Math.round((completedModules / totalModules) * 100);
};

/**
 * Construye el objeto completo de una ruta con sus módulos y recursos.
 * Si se pasa userId, incluye el estado de completitud (isPassed, score) de cada módulo.
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
  if (userId) {
    const progressResult = await turso.execute({
      sql: `SELECT mp.moduleId, mp.isPassed, mp.score 
            FROM ModuleProgress mp 
            JOIN Module m ON m.id = mp.moduleId 
            WHERE mp.userId = ? AND m.routeId = ?`,
      args: [userId, routeId]
    });
    for (const row of progressResult.rows) {
      progressMap[row.moduleId] = { isPassed: Boolean(row.isPassed), score: row.score };
    }
  }

  const modules = await Promise.all(modulesResult.rows.map(async (mod) => {
    const resourcesResult = await turso.execute({
      sql: `SELECT mr.position, r.* FROM ModuleResource mr
            JOIN Resource r ON r.id = mr.resourceId
            WHERE mr.moduleId = ? ORDER BY mr.position ASC`,
      args: [mod.id]
    });
    const modProgress = progressMap[mod.id] || { isPassed: false, score: null };
    return { 
      ...mod, 
      isPassed: modProgress.isPassed,
      score: modProgress.score,
      resources: resourcesResult.rows 
    };
  }));

  return { ...route, modules };
};

// ─── Controladores ────────────────────────────────────────────────────────────

export const createRoute = async (req, res) => {
  try {
    const { title, description, category, estimatedTime, difficulty, evaluationRules, modules, imageUrl, subjectId } = req.body;
    const authorId = req.user.id;

    if (!title) return res.status(400).json({ error: 'El título es obligatorio.' });

    await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, subjectId, imageUrl, estimatedTime, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [title, description || null, category || null,
             subjectId || inferSubjectId(category),
             imageUrl || null,
             estimatedTime ? parseInt(estimatedTime) : null,
             difficulty || 'BEGINNER', evaluationRules || null, authorId]
    });

    const routeResult = await turso.execute({
      sql: `SELECT id FROM LearningRoute WHERE authorId = ? ORDER BY id DESC LIMIT 1`,
      args: [authorId]
    });
    const routeId = routeResult.rows[0].id;

    if (modules?.length) {
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        await turso.execute({
          sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
          args: [mod.title, mod.description || null, i + 1, routeId]
        });

        const modResult = await turso.execute({
          sql: `SELECT id FROM Module WHERE routeId = ? ORDER BY id DESC LIMIT 1`,
          args: [routeId]
        });
        const moduleId = modResult.rows[0].id;

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
    // Sincronizar al Grafo de Conocimiento
    syncRouteToGraph(routeId, title, category, fullRoute?.modules || []);

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
    const userId = req.user?.id || null;
    const route = await buildFullRoute(parseInt(req.params.id), userId);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });
    return res.json(route);
  } catch (error) {
    console.error('Error en getRouteById:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener la ruta' });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const routeId = parseInt(id);

    const existing = await turso.execute({ sql: `SELECT id FROM LearningRoute WHERE id = ?`, args: [routeId] });
    if (!existing.rows.length) return res.status(404).json({ error: 'Ruta no encontrada.' });

    await turso.execute({ sql: `DELETE FROM LearningRoute WHERE id = ?`, args: [routeId] });
    deleteRouteFromGraph(routeId);

    return res.status(200).json({ message: 'Ruta eliminada correctamente.' });
  } catch (error) {
    console.error('Error en deleteRoute:', error);
    return res.status(500).json({ error: 'Error al eliminar la ruta.' });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const routeId = parseInt(id);
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
      // Borrar módulos viejos (CASCADE borrará ModuleResources)
      await turso.execute({ sql: `DELETE FROM Module WHERE routeId = ?`, args: [routeId] });

      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        await turso.execute({
          sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
          args: [mod.title, mod.description || null, i + 1, routeId]
        });

        const modResult = await turso.execute({
          sql: `SELECT id FROM Module WHERE routeId = ? ORDER BY id DESC LIMIT 1`,
          args: [routeId]
        });
        const moduleId = modResult.rows[0].id;

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

    const updatedRoute = await buildFullRoute(routeId);
    syncRouteToGraph(routeId, title, category, updatedRoute?.modules || []);

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

    const model       = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const promptParts = [systemPrompt];

    if (uploadedFile) {
      promptParts.push({
        inlineData: { data: uploadedFile.buffer.toString('base64'), mimeType: uploadedFile.mimetype }
      });
    }

    const result    = await model.generateContent(promptParts);
    let aiResponse  = result.response.text().trim();
    aiResponse      = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsedData = JSON.parse(aiResponse);

    // Insertar Ruta
    // `subjectId` es opcional: si no viene, se deduce de `category`.
    await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, subjectId, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, 'Generada por IA', ?, ?, ?, ?, 0)`,
      args: [parsedData.title, parsedData.description,
             subjectId || inferSubjectId(parsedData.category ?? category),
             difficulty || 'INTERMEDIATE', parsedData.evaluationRules, authorId]
    });

    const routeResult = await turso.execute({
      sql: `SELECT id FROM LearningRoute WHERE authorId = ? ORDER BY id DESC LIMIT 1`,
      args: [authorId]
    });
    const routeId = routeResult.rows[0].id;

    // Insertar módulos y recursos
    for (let i = 0; i < parsedData.modules.length; i++) {
      const mod = parsedData.modules[i];
      await turso.execute({
        sql: `INSERT INTO Module (title, description, position, routeId) VALUES (?, ?, ?, ?)`,
        args: [mod.title, mod.description || null, i + 1, routeId]
      });

      const modResult = await turso.execute({
        sql: `SELECT id FROM Module WHERE routeId = ? ORDER BY id DESC LIMIT 1`,
        args: [routeId]
      });
      const moduleId = modResult.rows[0].id;

      if (mod.resources?.length) {
        for (let j = 0; j < mod.resources.length; j++) {
          const res = mod.resources[j];
          await turso.execute({
            sql: `INSERT INTO Resource (title, url, type, authorId) VALUES (?, ?, ?, ?)`,
            args: [res.title, res.url, res.type || 'LINK', authorId]
          });
          const resResult = await turso.execute({
            sql: `SELECT id FROM Resource WHERE url = ? AND authorId = ? ORDER BY id DESC LIMIT 1`,
            args: [res.url, authorId]
          });
          await turso.execute({
            sql: `INSERT OR IGNORE INTO ModuleResource (moduleId, resourceId, position) VALUES (?, ?, ?)`,
            args: [moduleId, resResult.rows[0].id, j + 1]
          });
        }
      }
    }

    const fullRoute = await buildFullRoute(routeId);
    syncRouteToGraph(routeId, parsedData.title, 'Generada por IA', fullRoute?.modules || []);

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
        const route = await buildFullRoute(id);
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
    const { id }   = req.params;
    const userId   = req.user.id;
    const routeId  = parseInt(id);

    const existing = await turso.execute({
      sql: `SELECT id FROM Enrollment WHERE userId = ? AND learningRouteId = ?`,
      args: [userId, routeId]
    });

    if (existing.rows.length) {
      return res.status(400).json({ message: 'Ya estás inscrito en esta ruta.' });
    }

    await turso.execute({
      sql: `INSERT INTO Enrollment (userId, learningRouteId) VALUES (?, ?)`,
      args: [userId, routeId]
    });

    const result = await turso.execute({
      sql: `SELECT * FROM Enrollment WHERE userId = ? AND learningRouteId = ?`,
      args: [userId, routeId]
    });

    return res.status(201).json({ message: 'Inscripción exitosa.', enrollment: result.rows[0] });
  } catch (error) {
    console.error('Error en enrollRoute:', error);
    return res.status(500).json({ error: 'Error al inscribirse en la ruta.' });
  }
};

export const completeModule = async (req, res) => {
  try {
    const { moduleId, score, passed } = req.body;
    const userId = req.user.id;
    const modId  = parseInt(moduleId);

    if (!passed) {
      return res.status(200).json({ message: 'Sigue practicando para aprobar el módulo.' });
    }

    const existingProgress = await turso.execute({
      sql: `SELECT id FROM ModuleProgress WHERE userId = ? AND moduleId = ?`,
      args: [userId, modId]
    });

    if (existingProgress.rows.length) {
      return res.status(200).json({ message: 'Módulo ya completado anteriormente.' });
    }

    await turso.execute({
      sql: `INSERT INTO ModuleProgress (userId, moduleId, isPassed, score) VALUES (?, ?, 1, ?)`,
      args: [userId, modId, score || 100]
    });

    // Obtener routeId y title del módulo
    const moduleData = await turso.execute({
      sql: `SELECT routeId, title FROM Module WHERE id = ?`,
      args: [modId]
    });
    const routeId = moduleData.rows[0].routeId;
    const moduleTitle = moduleData.rows[0].title;

    // Guardar en el Grafo Neo4j
    await markModuleAsCompleted(userId, routeId, moduleTitle, score || 100);

    // Calcular progreso con el mismo helper que usa `GET /routes/my-routes`,
    // para que el valor guardado y el devuelto nunca divergan.
    const progress = await getRouteProgress(userId, routeId);

    await turso.execute({
      sql: `UPDATE Enrollment SET progress = ? WHERE userId = ? AND learningRouteId = ?`,
      args: [progress, userId, routeId]
    });

    // Actualizar XP y Nivel
    const userResult = await turso.execute({ sql: `SELECT xp FROM User WHERE id = ?`, args: [userId] });
    const newXp      = (userResult.rows[0].xp || 0) + 50;
    const newLevel   = Math.floor(newXp / 1000) + 1;

    await turso.execute({
      sql: `UPDATE User SET xp = ?, level = ? WHERE id = ?`,
      args: [newXp, newLevel, userId]
    });

    return res.status(200).json({
      message: 'Módulo completado con éxito.',
      progress, xpGained: 50, newTotalXp: newXp, newLevel
    });
  } catch (error) {
    console.error('Error en completeModule:', error);
    return res.status(500).json({ error: 'Error al registrar el progreso.' });
  }
};
