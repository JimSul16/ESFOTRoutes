import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

/**
 * Obtener catálogo de materias del Grafo de Conocimiento (Neo4j)
 */
export const getSubjects = async () => {
  const response = await axios.get(`${API_URL}/graph/subjects`, { headers: getAuthHeader() });
  return response.data;
};

/**
 * Obtener módulos, temas y prerrequisitos de una materia
 */
export const getSubjectTopics = async (subjectId) => {
  const response = await axios.get(`${API_URL}/graph/subjects/${subjectId}/topics`, { headers: getAuthHeader() });
  return response.data;
};

/**
 * Guardar autodiagnóstico del estudiante (escala 1 a 5)
 */
export const submitSelfDiagnosis = async (diagnoses) => {
  const response = await axios.post(`${API_URL}/graph/self-diagnosis`, { diagnoses }, { headers: getAuthHeader() });
  return response.data;
};

/**
 * Generar ruta adaptativa personalizada basada en el Grafo de Conocimiento (HU-014)
 */
export const generatePersonalizedAdaptiveRoute = async (subjectId) => {
  const response = await axios.post(`${API_URL}/graph/generate-personalized-route`, { subjectId }, { headers: getAuthHeader() });
  return response.data;
};

/**
 * Obtener recomendaciones cruzadas interdisciplinarias
 */
export const getGraphRecommendations = async () => {
  const response = await axios.get(`${API_URL}/graph/recommendations`, { headers: getAuthHeader() });
  return response.data;
};

/**
 * Obtener subgrafo de un tema para contexto de tutoría (GraphRAG)
 */
export const getTopicGraphContext = async (topicId) => {
  const response = await axios.get(`${API_URL}/graph/topic/${topicId}/context`, { headers: getAuthHeader() });
  return response.data;
};
