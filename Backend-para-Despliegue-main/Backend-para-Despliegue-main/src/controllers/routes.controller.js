import { GoogleGenerativeAI } from '@google/generative-ai';
import { turso } from '../config/turso.js';
import { syncRouteToGraph, deleteRouteFromGraph, markModuleAsCompleted } from '../services/neo4j.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construye el objeto completo de una ruta con sus módulos y recursos.
 */
const buildFullRoute = async (routeId) => {
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

  const modules = await Promise.all(modulesResult.rows.map(async (mod) => {
    const resourcesResult = await turso.execute({
      sql: `SELECT mr.position, r.* FROM ModuleResource mr
            JOIN Resource r ON r.id = mr.resourceId
            WHERE mr.moduleId = ? ORDER BY mr.position ASC`,
      args: [mod.id]
    });
    return { ...mod, resources: resourcesResult.rows };
  }));

  return { ...route, modules };
};

// ─── Controladores ────────────────────────────────────────────────────────────

export const createRoute = async (req, res) => {
  try {
    const { title, description, category, estimatedTime, difficulty, evaluationRules, modules, imageUrl } = req.body;
    const authorId = req.user.id;

    if (!title) return res.status(400).json({ error: 'El título es obligatorio.' });

    await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, imageUrl, estimatedTime, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [title, description || null, category || null, imageUrl || null,
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
    const route = await buildFullRoute(parseInt(req.params.id));
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
    const { title, description, category, estimatedTime, difficulty, evaluationRules, modules, imageUrl } = req.body;

    const existing = await turso.execute({ sql: `SELECT id FROM LearningRoute WHERE id = ?`, args: [routeId] });
    if (!existing.rows.length) return res.status(404).json({ error: 'Ruta no encontrada.' });

    await turso.execute({
      sql: `UPDATE LearningRoute SET title=?, description=?, category=?, imageUrl=?,
            estimatedTime=?, difficulty=?, evaluationRules=?, updatedAt=datetime('now') WHERE id=?`,
      args: [title, description || null, category || null, imageUrl || null,
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
    const { topic, difficulty, additionalContext } = req.body;
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
    await turso.execute({
      sql: `INSERT INTO LearningRoute (title, description, category, difficulty, evaluationRules, authorId, isPublic)
            VALUES (?, ?, 'Generada por IA', ?, ?, ?, 0)`,
      args: [parsedData.title, parsedData.description, difficulty || 'INTERMEDIATE', parsedData.evaluationRules, authorId]
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
      sql: `SELECT lr.id FROM LearningRoute lr
            JOIN Enrollment e ON e.learningRouteId = lr.id
            WHERE e.userId = ?`,
      args: [userId]
    });

    // Rutas que creó (privadas)
    const authoredResult = await turso.execute({
      sql: `SELECT id FROM LearningRoute WHERE authorId = ? AND isPublic = 0`,
      args: [userId]
    });

    const allIds = [...new Set([
      ...enrolledResult.rows.map(r => r.id),
      ...authoredResult.rows.map(r => r.id)
    ])];

    const routes = await Promise.all(allIds.map(id => buildFullRoute(id)));
    return res.json(routes);
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

    // Calcular progreso
    const totalResult = await turso.execute({
      sql: `SELECT COUNT(*) as total FROM Module WHERE routeId = ?`,
      args: [routeId]
    });
    const completedResult = await turso.execute({
      sql: `SELECT COUNT(*) as done FROM ModuleProgress mp
            JOIN Module m ON m.id = mp.moduleId
            WHERE mp.userId = ? AND m.routeId = ?`,
      args: [userId, routeId]
    });

    const total      = totalResult.rows[0].total;
    const completed  = completedResult.rows[0].done;
    const progress   = total === 0 ? 0 : Math.round((completed / total) * 100);

    await turso.execute({
      sql: `UPDATE Enrollment SET progress = ? WHERE userId = ? AND learningRouteId = ?`,
      args: [progress, userId, routeId]
    });

    // Actualizar XP y Nivel
    const userResult = await turso.execute({ sql: `SELECT xp FROM User WHERE id = ?`, args: [userId] });
    const newXp      = (userResult.rows[0].xp || 0) + 50;
    const newLevel   = Math.floor(newXp / 1000) + 1;

    await turso.execute({
      sql: `UPDATE User SET xp = ?, level = ?, updatedAt = datetime('now') WHERE id = ?`,
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
