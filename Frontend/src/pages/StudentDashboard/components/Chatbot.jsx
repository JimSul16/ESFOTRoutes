import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const Chatbot = ({ showChat, routeId, routeTitle, activeModule, onClose, onAsignarNuevoReto, codeToEvaluate, onCodeEvaluated }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [retoEnviadoId, setRetoEnviadoId] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentGreeting = {
    sender: 'AI',
    isGreeting: true,
    text: activeModule?.title
      ? `¡Hola! Soy tu tutor virtual de la EPN. Actualmente estás en el módulo "${activeModule.title}". ¿En qué te puedo ayudar hoy o prefieres que te asigne un reto práctico sobre este tema específico?`
      : routeTitle
      ? `¡Hola! Soy tu tutor virtual de la EPN para la ruta "${routeTitle}". ¿En qué te puedo ayudar hoy o prefieres que te ponga un reto práctico?`
      : `¡Hola! Soy tu tutor virtual de la EPN. ¿En qué te puedo ayudar hoy? Puedes hacerme consultas generales o pedirme ejercicios de programación sobre cualquier tema.`
  };

  const displayMessages = [currentGreeting, ...messages];

  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, showChat]);

  useEffect(() => {
    if (codeToEvaluate) {
      processMessage(codeToEvaluate, null);
      if (onCodeEvaluated) {
        onCodeEvaluated();
      }
    }
  }, [codeToEvaluate]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processMessage = async (text, file) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token'); 

    if (!token) {
      setMessages(prev => [...prev, { sender: 'AI', text: "Error de autenticación. Por favor, vuelve a iniciar sesión." }]);
      return;
    }

    setMessages(prev => [...prev, { 
      sender: 'STUDENT', 
      text: text || 'Archivo adjunto enviado',
      file: file ? file.name : null 
    }]);
    
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${backendUrl}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          routeId,
          moduleId: activeModule?.id,
          message: text || 'Revisa el archivo adjunto (simulación).',
          sessionId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, { sender: 'AI', text: data.reply.content }]);
        
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
      } else {
        setMessages(prev => [...prev, { sender: 'AI', text: data.error || "Hubo un error al procesar tu mensaje." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'AI', text: "Lo siento, hubo un error de conexión con el servidor." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    processMessage(input.trim(), selectedFile);
    
    setInput('');
    setSelectedFile(null);
  };

  const handleAsignarReto = (text, idx) => {
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

      <div className={`relative w-full sm:w-[450px] h-full bg-slate-50 dark:bg-slate-950 flex flex-col shadow-2xl transition-transform duration-300 ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 flex justify-between items-center text-white shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl backdrop-blur-md shadow-inner">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Tutor IA</h3>
              <span className="text-xs text-violet-200 font-medium tracking-wide truncate max-w-[200px] block">
                {activeModule?.title || routeTitle || 'Asistente Global EPN'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {displayMessages.map((msg, idx) => {
            const messageId = msg.isGreeting ? 'greeting' : idx;
            const isStudent = msg.sender === 'STUDENT';
            
            return (
              <div key={messageId} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 text-[14px] leading-relaxed shadow-sm flex flex-col ${
                  isStudent
                    ? 'bg-violet-600 text-white rounded-tr-sm' 
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.file && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-black/10 dark:bg-black/30 rounded-lg text-sm border border-black/5">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                      <span className="truncate">{msg.file}</span>
                    </div>
                  )}
                  
                  <div className="markdown-chat-container">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-inherit" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        h3: ({node, ...props}) => <h3 className="font-bold text-lg mt-4 mb-2" {...props} />,
                        h4: ({node, ...props}) => <h4 className="font-bold text-md mt-3 mb-1" {...props} />,
                        code: ({node, className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match && !String(children).includes('\n');
                          return isInline ? (
                            <code className={`px-1.5 py-0.5 rounded font-mono text-[13px] ${isStudent ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-violet-600 dark:text-violet-400'}`} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className={`block p-3 rounded-lg font-mono text-[13px] my-3 overflow-x-auto ${isStudent ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-violet-600 dark:text-violet-400'}`} {...props}>
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
                      onClick={() => handleAsignarReto(msg.text, messageId)}
                      className={`mt-4 self-start flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        retoEnviadoId === messageId 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                      }`}
                    >
                      {retoEnviadoId === messageId ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          🔄 Reenviar al editor
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-4 flex gap-2 shadow-sm items-center">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          
          {selectedFile && (
            <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 p-2 rounded-lg text-sm px-3">
              <div className="flex items-center gap-2 truncate">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span className="truncate font-medium">{selectedFile.name}</span>
              </div>
              <button type="button" onClick={() => setSelectedFile(null)} className="hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
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
              className="p-3 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
              title="Adjuntar material de estudio"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Escribe tu duda o adjunta un archivo..."
              className="flex-grow bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 border border-transparent focus:border-violet-200 dark:focus:border-violet-800 transition-all"
            />
            
            <button 
              type="submit" 
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="bg-violet-600 text-white p-3 rounded-xl hover:bg-violet-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 transition-all flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-6 h-6 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>

          </form>
        </div>

      </div>
    </div>
  );
};

export default Chatbot;