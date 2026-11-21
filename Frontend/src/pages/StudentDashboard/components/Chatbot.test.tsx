import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getChatMessages, getChatSessions, sendChatMessage } from '../../../api/chat.api';
import Chatbot from './Chatbot';

vi.mock('../../../api/chat.api', () => ({
  sendChatMessage: vi.fn(),
  getChatSessions: vi.fn(),
  getChatMessages: vi.fn(),
}));

vi.mock('../../../api/graph.api', () => ({
  getModuleTopics: vi.fn().mockResolvedValue([]),
  getTopicGraphContext: vi.fn(),
}));

const mockSessions = vi.mocked(getChatSessions);
const mockMessages = vi.mocked(getChatMessages);
const mockSend = vi.mocked(sendChatMessage);

const session = (id: number, title: string) => ({
  id, moduleId: 7, title, topic: null, createdAt: '2026-11-20 10:00:00', updatedAt: '2026-11-20 10:00:00',
  moduleTitle: 'Módulo 7', messageCount: 2, lastMessage: `último de ${title}`, lastMessageAt: '2026-11-20 10:00:00',
});

const renderChat = () =>
  render(
    <Chatbot showChat routeId="3" routeTitle="Redes" activeModule={{ id: '7', title: 'Módulo 7' }} onClose={vi.fn()} />
  );

describe('Chatbot — historial persistido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom no implementa `scrollIntoView` (el chat hace scroll al final).
    Element.prototype.scrollIntoView = vi.fn();
    mockSessions.mockResolvedValue({ sessions: [session(42, 'Subnetting'), session(41, 'OSI')], hasMore: false, limit: 20, offset: 0 });
    mockMessages.mockImplementation(async (id) => ({
      session: { id: Number(id), moduleId: 7, title: 't', topic: null, moduleTitle: 'Módulo 7' },
      messages: [
        { id: 1, sender: 'STUDENT', content: `pregunta ${id}` },
        { id: 2, sender: 'AI', content: `respuesta ${id}` },
      ],
      hasMore: false,
    }));
  });

  it('al abrir retoma la última conversación del módulo y la continúa', async () => {
    renderChat();

    await waitFor(() => expect(mockSessions).toHaveBeenCalledWith({ moduleId: '7', limit: 20 }));
    expect(await screen.findByText('respuesta 42')).toBeTruthy();

    mockSend.mockResolvedValue({ sessionId: 42, reply: { content: 'seguimos' } });
    fireEvent.change(screen.getByPlaceholderText(/escribe tu consulta/i), { target: { value: 'hola' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    await waitFor(() => expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ sessionId: '42', moduleId: '7' })));
  });

  it('el panel de historial permite abrir otra sesión o empezar una nueva', async () => {
    renderChat();
    expect(await screen.findByText('respuesta 42')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /conversaciones anteriores/i }));
    fireEvent.click(await screen.findByText('OSI'));
    expect(await screen.findByText('respuesta 41')).toBeTruthy();
    expect(screen.queryByText('respuesta 42')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /conversaciones anteriores/i }));
    fireEvent.click(await screen.findByText('Nueva conversación'));
    expect(screen.queryByText('respuesta 41')).toBeNull();

    mockSend.mockResolvedValue({ sessionId: 50, reply: { content: 'nueva' } });
    fireEvent.change(screen.getByPlaceholderText(/escribe tu consulta/i), { target: { value: 'otra' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }));
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ sessionId: undefined })));
  });

  it('sin historial guardado muestra solo el saludo', async () => {
    mockSessions.mockResolvedValue({ sessions: [], hasMore: false, limit: 20, offset: 0 });
    renderChat();

    await waitFor(() => expect(mockSessions).toHaveBeenCalled());
    expect(mockMessages).not.toHaveBeenCalled();
    expect(screen.getByText(/actualmente estás en el módulo "Módulo 7"/i)).toBeTruthy();
  });
});
