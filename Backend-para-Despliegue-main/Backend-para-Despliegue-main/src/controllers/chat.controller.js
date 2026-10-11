import { turso } from '../config/turso.js';
import { generateChatResponse, generateModuleAssessmentService } from '../services/chat.service.js';

export const processChatMessage = async (req, res) => {
  try {
    const { moduleId, topicId, message, sessionId } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje del estudiante no puede estar vacío.' });
    }

    const userResult = await turso.execute({ sql: `SELECT * FROM User WHERE id = ?`, args: [userId] });
    const user = userResult.rows[0];

    const result = await generateChatResponse({
      userId,
      moduleId,
      topicId,
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

    const assessment = await generateModuleAssessmentService(moduleId, type);
    return res.status(200).json(assessment);
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ error: 'Límite de peticiones de IA alcanzado.' });
    }
    console.error('Error en generateModuleAssessment:', error);
    return res.status(500).json({ error: error.message || 'Error al generar la evaluación dinámica.' });
  }
};
