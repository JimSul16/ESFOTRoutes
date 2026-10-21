import {
  getSubjectsWithCounts,
  getSubjectTopicsWithPrereqs,
  saveUserSelfDiagnosis,
  getCrossCurricularRecommendations,
  getTopicContextForChat,
  getModuleTopicsByModuleId
} from '../services/knowledgeGraph.service.js';
import { generateAndPersistAdaptiveRoute } from '../services/graphAlgorithm.js';

/**
 * Obtener catálogo de materias con módulos y temas
 * GET /api/graph/subjects
 */
export const getSubjects = async (req, res) => {
  try {
    const subjects = await getSubjectsWithCounts();
    return res.json({ success: true, subjects });
  } catch (error) {
    console.error('Error en getSubjects:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar materias del grafo.' });
  }
};

/**
 * Obtener temario con dependencias y prerrequisitos de una materia
 * GET /api/graph/subjects/:id/topics
 */
export const getSubjectTopics = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'ID de materia requerido.' });

    const modules = await getSubjectTopicsWithPrereqs(id);
    return res.json({ success: true, modules });
  } catch (error) {
    console.error(`Error en getSubjectTopics para ${req.params.id}:`, error);
    return res.status(500).json({ success: false, error: 'Error al consultar temas de la materia.' });
  }
};

/**
 * Guardar autodiagnóstico del estudiante por temas
 * POST /api/graph/self-diagnosis
 * Body: { diagnoses: [{ topicId: '...', level: 1..5 }] }
 */
export const submitSelfDiagnosis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { diagnoses } = req.body;

    if (!Array.isArray(diagnoses) || diagnoses.length === 0) {
      return res.status(400).json({ success: false, error: 'El cuerpo debe contener un arreglo no vacío de diagnósticos.' });
    }

    const result = await saveUserSelfDiagnosis(userId, diagnoses);
    return res.status(200).json({
      success: true,
      message: 'Autodiagnóstico registrado exitosamente en el grafo.',
      savedCount: result.count
    });
  } catch (error) {
    console.error('Error en submitSelfDiagnosis:', error);
    return res.status(500).json({ success: false, error: 'Error al guardar autodiagnóstico en el grafo.' });
  }
};

/**
 * Generar ruta adaptativa personalizada mediante orden topológico ponderado
 * POST /api/graph/generate-personalized-route
 * Body: { subjectId: 'redes' | 'web' }
 */
export const generatePersonalizedRoute = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'Debe especificar el subjectId (ej. redes o web).' });
    }

    const result = await generateAndPersistAdaptiveRoute({
      userId,
      subjectId,
      authorId: userId
    });

    return res.status(201).json({
      success: true,
      message: 'Ruta adaptativa generada y sincronizada exitosamente.',
      ...result
    });
  } catch (error) {
    console.error('Error en generatePersonalizedRoute:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al generar la ruta adaptativa.' });
  }
};

/**
 * Obtener recomendaciones cruzadas basadas en el grafo
 * GET /api/graph/recommendations
 */
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const recommendations = await getCrossCurricularRecommendations(userId);
    return res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Error en getRecommendations:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar recomendaciones.' });
  }
};

/**
 * Temas curriculares que cubre un módulo de una ruta.
 * GET /api/graph/module/:moduleId/topics
 *
 * El frontend lo usa para derivar el `topicId` que activa el GraphRAG del
 * chat: sin él, el tutor recibía el contexto global débil.
 */
export const getModuleTopics = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const topics = await getModuleTopicsByModuleId(moduleId);
    return res.json({ success: true, topics });
  } catch (error) {
    console.error(`Error en getModuleTopics para ${req.params.moduleId}:`, error);
    return res.status(500).json({ success: false, error: 'Error al consultar los temas del módulo.' });
  }
};

/**
 * Obtener contexto de un tema para GraphRAG
 * GET /api/graph/topic/:topicId/context
 */
export const getTopicContext = async (req, res) => {
  try {
    const { topicId } = req.params;
    const context = await getTopicContextForChat(topicId);
    if (!context) {
      return res.status(404).json({ success: false, error: 'Tema no encontrado en el grafo.' });
    }
    return res.json({ success: true, context });
  } catch (error) {
    console.error('Error en getTopicContext:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar contexto del tema.' });
  }
};
