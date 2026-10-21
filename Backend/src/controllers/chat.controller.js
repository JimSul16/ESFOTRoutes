import { turso } from '../config/turso.js';
import { generateChatResponse, generateModuleAssessmentService } from '../services/chat.service.js';

export const processChatMessage = async (req, res) => {
  try {
    const { moduleId, topicId, message, sessionId, routeId } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje del estudiante no puede estar vacío.' });
    }

    // LIM-08: un `sessionId` no numérico producía `NaN`, que Turso no puede
    // enlazar, y el endpoint respondía 500 con un RangeError.
    if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
      if (!Number.isInteger(parseInt(sessionId, 10))) {
        return res.status(400).json({ error: 'El identificador de sesión no es válido.' });
      }
    }

    // LIM-06: un `moduleId` inexistente reventaba con un 500 por la FK de
    // `ChatSession.moduleId`.
    let parsedModuleId = null;
    if (moduleId !== undefined && moduleId !== null && moduleId !== '') {
      parsedModuleId = parseInt(moduleId, 10);
      if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) {
        return res.status(400).json({ error: 'El identificador del módulo no es válido.' });
      }
      const modResult = await turso.execute({
        sql: `SELECT id FROM Module WHERE id = ?`,
        args: [parsedModuleId]
      });
      if (!modResult.rows.length) {
        return res.status(404).json({ error: 'Módulo no encontrado.' });
      }
    }

    const userResult = await turso.execute({ sql: `SELECT * FROM User WHERE id = ?`, args: [userId] });
    const user = userResult.rows[0];

    const result = await generateChatResponse({
      userId,
      moduleId: parsedModuleId ?? undefined,
      topicId,
      routeId,
      message,
      sessionId,
      user
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ error: 'Límite de peticiones de IA alcanzado. Por favor espera un momento.' });
    }
    console.error('Error en processChatMessage:', error);
    return res.status(500).json({ error: 'Error interno al procesar el mensaje con el tutor IA.' });
  }
};

export const generateModuleAssessment = async (req, res) => {
  try {
    const { moduleId, type = 'completa' } = req.body;

    if (!moduleId) {
      return res.status(400).json({ error: 'El moduleId es requerido.' });
    }

    const parsedModuleId = parseInt(moduleId, 10);
    if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) {
      return res.status(400).json({ error: 'El identificador del módulo no es válido.' });
    }

    // LIM-07: antes un módulo inexistente terminaba en un 500.
    const modResult = await turso.execute({
      sql: `SELECT id FROM Module WHERE id = ?`,
      args: [parsedModuleId]
    });
    if (!modResult.rows.length) {
      return res.status(404).json({ error: 'Módulo no encontrado.' });
    }

    const assessment = await generateModuleAssessmentService(parsedModuleId, type);
    return res.status(200).json(assessment);
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ error: 'Límite de peticiones de IA alcanzado.' });
    }
    console.error('Error en generateModuleAssessment:', error);
    return res.status(500).json({ error: error.message || 'Error al generar la evaluación dinámica.' });
  }
};
