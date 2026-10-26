import httpClient from './httpClient';
import type {
  GraphModule,
  GraphRecommendation,
  GraphTopic,
  PersonalizedRouteResult,
  SelfDiagnosis,
  SelfDiagnosisResult,
  Subject,
  TopicGraphContext,
} from '../types';

/**
 * El backend envuelve las respuestas del grafo en `{ success, ... }`.
 * Estas funciones desenvuelven ese sobre para que los componentes reciban
 * directamente el dato, igual que el resto de la capa API.
 */

export const getSubjects = async (): Promise<Subject[]> => {
  const response = await httpClient.get<{ success: boolean; subjects: Subject[] }>('/graph/subjects');
  return response.data.subjects;
};

/** Devuelve los módulos de la materia con sus temas y prerrequisitos agrupados. */
export const getSubjectTopics = async (subjectId: string): Promise<GraphModule[]> => {
  const response = await httpClient.get<{ success: boolean; modules: GraphModule[] }>(
    `/graph/subjects/${subjectId}/topics`
  );
  return response.data.modules;
};

export const submitSelfDiagnosis = async (
  diagnoses: SelfDiagnosis[]
): Promise<SelfDiagnosisResult> => {
  const response = await httpClient.post<SelfDiagnosisResult>('/graph/self-diagnosis', { diagnoses });
  return response.data;
};

export const generatePersonalizedAdaptiveRoute = async (
  subjectId: string
): Promise<PersonalizedRouteResult> => {
  const response = await httpClient.post<
    PersonalizedRouteResult & { success: boolean; message: string }
  >('/graph/generate-personalized-route', { subjectId });
  return response.data;
};

export const getGraphRecommendations = async (): Promise<GraphRecommendation[]> => {
  const response = await httpClient.get<{ success: boolean; recommendations: GraphRecommendation[] }>(
    '/graph/recommendations'
  );
  return response.data.recommendations;
};

/**
 * Temas curriculares que cubre un módulo de una ruta.
 *
 * El grafo es quien sabe qué temas pertenecen a cada módulo: el frontend no
 * los conoce y, por eso, no podía activar el GraphRAG del chat.
 */
export const getModuleTopics = async (moduleId: string): Promise<GraphTopic[]> => {
  const response = await httpClient.get<{ success: boolean; topics: GraphTopic[] }>(
    `/graph/module/${moduleId}/topics`
  );
  return response.data.topics ?? [];
};

/** Subgrafo local de un tema, usado como contexto GraphRAG por el chat. */
export const getTopicGraphContext = async (topicId: string): Promise<TopicGraphContext | null> => {
  const response = await httpClient.get<{ success: boolean; context: TopicGraphContext }>(
    `/graph/topic/${topicId}/context`
  );
  return response.data.context ?? null;
};