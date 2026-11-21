import { useCallback, useState } from 'react';
import { getChatMessages, getChatSessions } from '@/api/chat.api';
import type { ChatMessage, ChatMessageRow, ChatSessionSummary } from '@/types';

/** Fila de `ChatMessage` del backend → mensaje del hilo del chat. */
export const toThreadMessage = (row: ChatMessageRow): ChatMessage => ({
  sender: row.sender === 'STUDENT' ? 'STUDENT' : 'AI',
  text: row.content,
  timestamp: row.createdAt,
});

export interface LoadedSession {
  sessionId: string;
  messages: ChatMessage[];
}

/**
 * Historial persistido del tutor IA (`GET /chat/sessions`).
 *
 * Las sesiones pertenecen a un módulo (o a ninguno, el chat general): el
 * backend abre una sesión nueva si se intenta continuar la de otro módulo,
 * así que aquí solo se listan las del contexto activo.
 */
export const useChatHistory = (moduleId: string | null | undefined) => {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const matchesContext = useCallback(
    (s: ChatSessionSummary) =>
      moduleId ? String(s.moduleId) === String(moduleId) : s.moduleId == null,
    [moduleId]
  );

  const loadSessions = useCallback(async (): Promise<ChatSessionSummary[]> => {
    setLoadingSessions(true);
    try {
      const res = await getChatSessions(moduleId ? { moduleId, limit: 20 } : { limit: 50 });
      const own = res.sessions.filter(matchesContext);
      setSessions(own);
      return own;
    } catch {
      setSessions([]);
      return [];
    } finally {
      setLoadingSessions(false);
    }
  }, [moduleId, matchesContext]);

  const loadSession = useCallback(async (sessionId: string | number): Promise<LoadedSession | null> => {
    try {
      const res = await getChatMessages(String(sessionId));
      return { sessionId: String(res.session.id), messages: res.messages.map(toThreadMessage) };
    } catch {
      return null;
    }
  }, []);

  /** Última sesión del contexto activo, con sus mensajes (o `null`). */
  const loadLatest = useCallback(async (): Promise<LoadedSession | null> => {
    const own = await loadSessions();
    return own.length ? loadSession(own[0].id) : null;
  }, [loadSessions, loadSession]);

  return { sessions, loadingSessions, loadSessions, loadSession, loadLatest };
};
