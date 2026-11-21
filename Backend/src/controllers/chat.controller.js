import { turso } from '../config/turso.js';
import { generateChatResponse, generateModuleAssessmentService } from '../services/chat.service.js';
import { assertModuleAccess, sendAccessError } from '../services/routeAccess.service.js';

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
      // También impide usar el tutor para leer el material (y las reglas
      // de evaluación) de la ruta privada de otro estudiante.
      await assertModuleAccess(userId, parsedModuleId);
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
    if (sendAccessError(res, error)) return;
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

    // LIM-07: antes un módulo inexistente terminaba en un 500. Además, la
    // evaluación generada se guarda: solo para módulos de rutas accesibles.
    await assertModuleAccess(req.user.id, parsedModuleId);

    const assessment = await generateModuleAssessmentService(parsedModuleId, type);
    return res.status(200).json(assessment);
  } catch (error) {
    if (sendAccessError(res, error)) return;
    if (error.status === 429) {
      return res.status(429).json({ error: 'Límite de peticiones de IA alcanzado.' });
    }
    console.error('Error en generateModuleAssessment:', error);
    return res.status(500).json({ error: error.message || 'Error al generar la evaluación dinámica.' });
  }
};

/**
 * Sesiones de chat del estudiante, de la más reciente a la más antigua.
 * GET /api/chat/sessions?moduleId=&limit=&offset=
 *
 * Paginación con `hasMore` (se pide `limit + 1`): un `total` con el tamaño
 * de la página confundía al cliente. El orden secundario por `id` desempata
 * sesiones con el mismo `updatedAt` (resolución de 1 s).
 */
export const getChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { moduleId, limit = '20', offset = '0' } = req.query;

    const parsedLimit  = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let sql = `
      SELECT cs.id, cs.moduleId, cs.title, cs.topic, cs.createdAt, cs.updatedAt,
             m.title AS moduleTitle,
             (SELECT COUNT(*) FROM ChatMessage cm WHERE cm.sessionId = cs.id) AS messageCount,
             (SELECT cm2.content FROM ChatMessage cm2
               WHERE cm2.sessionId = cs.id ORDER BY cm2.id DESC LIMIT 1) AS lastMessage,
             (SELECT cm3.createdAt FROM ChatMessage cm3
               WHERE cm3.sessionId = cs.id ORDER BY cm3.id DESC LIMIT 1) AS lastMessageAt
      FROM ChatSession cs
      LEFT JOIN Module m ON m.id = cs.moduleId
      WHERE cs.userId = ?`;
    const args = [userId];

    if (moduleId !== undefined && moduleId !== '') {
      const parsedModuleId = parseInt(moduleId, 10);
      if (!Number.isInteger(parsedModuleId) || parsedModuleId <= 0) {
        return res.status(400).json({ error: 'El moduleId no es válido.' });
      }
      sql += ` AND cs.moduleId = ?`;
      args.push(parsedModuleId);
    }

    sql += ` ORDER BY cs.updatedAt DESC, cs.id DESC LIMIT ? OFFSET ?`;
    args.push(parsedLimit + 1, parsedOffset);

    const result = await turso.execute({ sql, args });
    const hasMore = result.rows.length > parsedLimit;

    return res.status(200).json({
      sessions: result.rows.slice(0, parsedLimit),
      hasMore,
      limit: parsedLimit,
      offset: parsedOffset
    });
  } catch (error) {
    console.error('Error en getChatSessions:', error);
    return res.status(500).json({ error: 'Error interno al obtener las sesiones de chat.' });
  }
};

/**
 * Mensajes de una sesión propia, en orden cronológico.
 * GET /api/chat/sessions/:sessionId/messages?before=&limit=
 *
 * Paginación por cursor (`before` = id del mensaje más antiguo cargado):
 * devuelve los `limit` mensajes anteriores, ordenados de antiguo a reciente.
 * 404 tanto si la sesión no existe como si es de otro usuario.
 */
export const getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const parsedSessionId = parseInt(req.params.sessionId, 10);
    if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
      return res.status(400).json({ error: 'El sessionId no es válido.' });
    }

    const { before, limit = '50' } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    let parsedBefore = null;
    if (before !== undefined && before !== '') {
      parsedBefore = parseInt(before, 10);
      if (!Number.isInteger(parsedBefore) || parsedBefore <= 0) {
        return res.status(400).json({ error: 'El cursor "before" no es válido.' });
      }
    }

    const sessionResult = await turso.execute({
      sql: `SELECT cs.id, cs.moduleId, cs.title, cs.topic, cs.createdAt, cs.updatedAt,
                   m.title AS moduleTitle
            FROM ChatSession cs LEFT JOIN Module m ON m.id = cs.moduleId
            WHERE cs.id = ? AND cs.userId = ?`,
      args: [parsedSessionId, userId]
    });

    if (!sessionResult.rows.length) {
      return res.status(404).json({ error: 'Sesión no encontrada.' });
    }

    const messagesResult = await turso.execute({
      sql: `SELECT id, sender, content, fileUrl, isChallenge, createdAt
            FROM ChatMessage
            WHERE sessionId = ? ${parsedBefore ? 'AND id < ?' : ''}
            ORDER BY id DESC LIMIT ?`,
      args: parsedBefore
        ? [parsedSessionId, parsedBefore, parsedLimit + 1]
        : [parsedSessionId, parsedLimit + 1]
    });

    const hasMore = messagesResult.rows.length > parsedLimit;
    const messages = messagesResult.rows.slice(0, parsedLimit).reverse();

    return res.status(200).json({
      session: sessionResult.rows[0],
      messages,
      hasMore
    });
  } catch (error) {
    console.error('Error en getChatMessages:', error);
    return res.status(500).json({ error: 'Error interno al obtener los mensajes.' });
  }
};
