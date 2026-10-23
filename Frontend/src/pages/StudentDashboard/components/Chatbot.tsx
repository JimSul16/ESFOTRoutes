import { useState, useRef, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '../../../api/chat.api';
import { getModuleTopics, getTopicGraphContext } from '../../../api/graph.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { ChatMessage, TopicGraphContext } from '../../../types';

/** Mensaje en el hilo, con el archivo adjunto opcional que se subió. */
interface ThreadMessage extends ChatMessage {
  file?: string | null;
  isGreeting?: boolean;
}

export interface ChatbotProps {
  showChat: boolean;
  routeId?: string;
  routeTitle?: string;
  activeModule?: { id: string | null; title: string | null } | null;
  onClose: () => void;
  onAsignarNuevoReto?: (text: string) => void;
  codeToEvaluate?: string | null;
  onCodeEvaluated?: () => void;
}

const Chatbot = ({
  showChat,
  routeId,
  routeTitle,
  activeModule,
  onClose,
  onAsignarNuevoReto,
  codeToEvaluate,
  onCodeEvaluated,
}: ChatbotProps) => {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [retoEnviadoId, setRetoEnviadoId] = useState<number | null>(null);
  /**
   * Tema curricular del módulo activo. Es lo que activa el GraphRAG: sin él
   * el tutor recibía el contexto global débil y la detección de bloqueo
   * (`markTopicStruggle`) nunca llegaba al grafo.
   */
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicContext, setTopicContext] = useState<TopicGraphContext | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentGreeting = useMemo<ThreadMessage>(
    () => ({
      sender: 'AI',
      isGreeting: true,
      text: activeModule?.title
        ? `¡Hola! Soy tu tutor virtual de la EPN. Actualmente estás en el módulo "${activeModule.title}". ¿En qué te puedo ayudar hoy o prefieres que te asigne un reto práctico sobre este tema específico?`
        : routeTitle
        ? `¡Hola! Soy tu tutor virtual de la EPN para la ruta "${routeTitle}". ¿En qué te puedo ayudar hoy o prefieres que te ponga un reto práctico?`
        : `¡Hola! Soy tu tutor virtual de la EPN. ¿En qué te puedo ayudar hoy? Puedes hacerme consultas generales o pedirme ejercicios de programación sobre cualquier tema.`
    }),
    [activeModule?.title, routeTitle]
  );

  const displayMessages = useMemo(() => [currentGreeting, ...messages], [currentGreeting, messages]);

  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, showChat]);

  /**
   * Al cambiar de ruta o de módulo, el hilo se reinicia.
   *
   * El panel nunca se desmonta (se oculta con CSS), así que los mensajes y el
   * `sessionId` seguían apuntando al módulo anterior: el tutor respondía con
   * el contexto de la ruta vieja.
   */
  useEffect(() => {
    setMessages([]);
    setSessionId(null);
    setRetoEnviadoId(null);
  }, [routeId, activeModule?.id]);

  /**
   * Resuelve el tema curricular del módulo activo en el grafo y guarda su
   * contexto. Es lo que permite enviar un `topicId` real al chat.
   */
  useEffect(() => {
    let cancelled = false;
    const moduleId = activeModule?.id;

    // Se limpia SIEMPRE al principio: si no, al cambiar de módulo A a B el
    // `topicId` de A seguía en el estado durante el round-trip y podía
    // viajar con el `moduleId` de B (el tutor respondía sobre el tema viejo).
    setTopicId(null);
    setTopicContext(null);

    if (!showChat || !moduleId) {
      return;
    }

    (async () => {
      try {
        const topics = await getModuleTopics(moduleId);
        if (cancelled || topics.length === 0) {
          setTopicId(null);
          setTopicContext(null);
          return;
        }

        const first = topics[0];
        setTopicId(first.id);

        const context = await getTopicGraphContext(first.id);
        if (!cancelled) setTopicContext(context);
      } catch {
        // Sin tema no se rompe el chat: sigue funcionando con el contexto global.
        if (!cancelled) {
          setTopicId(null);
          setTopicContext(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showChat, activeModule?.id]);

  /**
   * Tema que se debe enviar con el mensaje.
   *
   * Se resuelve en el momento del envío (y no sólo desde el estado) porque
   * el flujo "Evaluar con IA" dispara el mensaje en el mismo commit en el que
   * se abre el chat: el `topicId` todavía no había resuelto y el mensaje
   * salía sin contexto GraphRAG.
   */
  const resolveTopicId = async (): Promise<string | undefined> => {
    if (topicId) return topicId;

    const moduleId = activeModule?.id;
    if (!moduleId) return undefined;

    try {
      const topics = await getModuleTopics(moduleId);
      const resolved = topics[0]?.id;
      if (resolved) {
        setTopicId(resolved);
        void getTopicGraphContext(resolved).then(setTopicContext).catch(() => {});
      }
      return resolved;
    } catch {
      return undefined;
    }
  };

  const processMessage = async (text: string, file: File | null) => {
    setMessages((prev) => [
      ...prev,
      { sender: 'STUDENT', text: text || 'Archivo adjunto enviado', file: file ? file.name : null },
    ]);

    setIsLoading(true);

    try {
      // El `topicId` es lo que enciende el GraphRAG del tutor.
      const resolvedTopicId = await resolveTopicId();

      // Antes: `fetch()` nativo. Ahora pasa por la capa tipada, que además
      // añade el `Authorization` automáticamente.
      const data = await sendChatMessage({
        routeId,
        moduleId: activeModule?.id ?? undefined,
        topicId: resolvedTopicId,
        message: text || 'Revisa el archivo adjunto (simulación).',
        sessionId: sessionId ?? undefined,
      });

      setMessages((prev) => [...prev, { sender: 'AI', text: data.reply.content }]);

      if (data.sessionId && !sessionId) {
        setSessionId(String(data.sessionId));
      }
    } catch (error: unknown) {
      setMessages((prev) => [
        ...prev,
        { sender: 'AI', text: getApiErrorMessage(error, 'Hubo un error de conexión con el servidor.') },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (codeToEvaluate) {
      processMessage(codeToEvaluate, null);
      onCodeEvaluated?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeToEvaluate]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    processMessage(input.trim(), selectedFile);

    setInput('');
    setSelectedFile(null);
  };

  const handleAsignarReto = (text: string, idx: number) => {
    if (onAsignarNuevoReto) {
      onAsignarNuevoReto(text);
      setRetoEnviadoId(idx);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ${showChat ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}>
      
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      ></div>

      <div className={`relative w-full sm:w-[460px] h-full bg-surface-50 dark:bg-surface-950 flex flex-col shadow-2xl transition-transform duration-300 border-l border-surface-200 dark:border-surface-800 ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 p-4 sm:p-5 flex justify-between items-center text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">Tutor IA EPN</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Activo
                </span>
              </div>
              <span className="text-xs text-brand-100/90 font-medium truncate max-w-[220px] block mt-0.5">
                {activeModule?.title || routeTitle || 'Asistente Académico'}
              </span>
              {/* Contexto GraphRAG activo: el tutor trabaja con el subgrafo de
                  este tema, no con el contexto global. */}
              {topicContext && (
                <span className="text-[10px] text-brand-100/80 font-medium truncate max-w-[220px] block mt-0.5">
                  📚 {topicContext.subjectName ?? 'Materia'} · {topicContext.name}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/15 p-2 rounded-xl transition-colors focus:outline-hidden"
            aria-label="Cerrar chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {displayMessages.map((msg, idx) => {
            // El saludo no viene del hilo, así que se identifica aparte. Solo
            // los mensajes reales usan índice numérico como clave.
            const isGreeting = Boolean(msg.isGreeting);
            const messageId = isGreeting ? 'greeting' : idx;
            const isStudent = msg.sender === 'STUDENT';
            
            return (
              <div key={messageId} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl p-4 text-[13.5px] leading-relaxed shadow-xs flex flex-col ${
                  isStudent
                    ? 'bg-brand-600 text-white rounded-tr-xs shadow-brand-600/20' 
                    : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-xs'
                }`}>
                  {msg.file && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-black/10 dark:bg-black/30 rounded-lg text-xs border border-black/5 font-mono">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                      <span className="truncate">{msg.file}</span>
                    </div>
                  )}
                  
                  <div className="markdown-chat-container">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-2.5 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-inherit" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2.5 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2.5 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        h3: ({node, ...props}) => <h3 className="font-bold text-base mt-3 mb-1.5" {...props} />,
                        h4: ({node, ...props}) => <h4 className="font-semibold text-sm mt-2 mb-1" {...props} />,
                        code: ({node, className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match && !String(children).includes('\n');
                          return isInline ? (
                            <code className={`px-1.5 py-0.5 rounded-md font-mono text-[12.5px] ${isStudent ? 'bg-black/25 text-white' : 'bg-surface-100 dark:bg-surface-800 text-brand-600 dark:text-brand-400 font-semibold'}`} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className={`block p-3 rounded-xl font-mono text-[12.5px] my-2.5 overflow-x-auto border ${isStudent ? 'bg-black/25 border-white/10 text-white' : 'bg-surface-900 text-surface-100 border-surface-800'}`} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>

                  {msg.sender === 'AI' && !msg.isGreeting && onAsignarNuevoReto && (
                    <button
                      onClick={() => handleAsignarReto(msg.text, idx)}
                      className={`mt-3 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        retoEnviadoId === idx
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                          : 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-200/80 dark:border-brand-500/20 hover:bg-brand-100 dark:hover:bg-brand-500/20'
                      }`}
                    >
                      {retoEnviadoId === messageId ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          Reenviado al editor
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                          Asignar como reto
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl rounded-tl-xs p-3.5 flex gap-2 shadow-xs items-center">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 flex flex-col gap-2.5">
          {selectedFile && (
            <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 p-2 rounded-xl text-xs px-3 border border-brand-200 dark:border-brand-800">
              <div className="flex items-center gap-2 truncate">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span className="truncate font-medium">{selectedFile.name}</span>
              </div>
              <button type="button" onClick={() => setSelectedFile(null)} aria-label="Quitar archivo adjunto" className="hover:text-rose-500 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Adjuntar material de estudio"
              className="p-2.5 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-surface-800 rounded-xl transition-colors shrink-0"
              title="Adjuntar material de estudio"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Escribe tu consulta o pide un reto..."
              className="flex-1 bg-surface-100 dark:bg-surface-800/80 text-surface-900 dark:text-surface-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50 border border-surface-200 dark:border-surface-700 transition-all placeholder:text-surface-400"
            />
            
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedFile)}
              aria-label="Enviar mensaje al tutor"
              className="bg-brand-600 text-white p-2.5 rounded-xl hover:bg-brand-700 disabled:bg-surface-200 disabled:text-surface-400 dark:disabled:bg-surface-800 dark:disabled:text-surface-600 transition-all flex items-center justify-center shrink-0 shadow-xs hover:shadow-brand-500/20"
            >
              <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Chatbot;