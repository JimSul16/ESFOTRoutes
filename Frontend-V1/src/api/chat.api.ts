import httpClient from './httpClient';
import type { AssessmentData, AssessmentType, ChatMessageRow } from '../types';

export interface SendChatMessagePayload {
  message: string;
  moduleId?: string;
  topicId?: string;
  sessionId?: string;
  routeId?: string;
}

export interface SendChatMessageResponse {
  /** `ChatSession.id` es INTEGER en SQLite, así que llega como número. */
  sessionId: string | number;
  /** Fila de `ChatMessage`, no un string: el texto está en `.content`. */
  reply: ChatMessageRow;
}

export interface AssessmentPayload {
  moduleId: string;
  type?: AssessmentType;
}

/** El backend devuelve el JSON crudo generado por Gemini. */
export type AssessmentResponse = AssessmentData;

export const sendMessage = async (
  payload: SendChatMessagePayload
): Promise<SendChatMessageResponse> => {
  const response = await httpClient.post<SendChatMessageResponse>('/chat/send', payload);
  return response.data;
};

export const sendChatMessage = sendMessage;

export const getAssessment = async (
  payload: AssessmentPayload
): Promise<AssessmentResponse> => {
  const response = await httpClient.post<AssessmentResponse>('/chat/assessment', payload);
  return response.data;
};

export const generateAssessment = getAssessment;