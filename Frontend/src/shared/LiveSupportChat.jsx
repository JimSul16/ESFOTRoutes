import { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const LiveSupportChat = ({ userData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER
    });

    const channel = pusher.subscribe('esfot-support-channel');
    
    channel.bind('new-message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const payload = {
      user: userData.name,
      role: userData.primaryRole,
      message: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setNewMessage("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      await fetch(`${apiUrl}/chat/live-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-8 bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-900/50 hover:scale-110 transition-transform z-50 flex items-center justify-center group"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-8 right-8 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 flex flex-col h-[500px] animate-in slide-in-from-bottom-10">
          <div className="bg-emerald-600 p-4 flex justify-between items-center text-white shrink-0">
            <div>
              <h3 className="font-bold">Soporte ESFOT (En vivo)</h3>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                Conectado
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-emerald-100 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-[#12141c]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                <svg className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                <p className="text-sm">Inicia una conversación con los administradores de TSDS.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.user === userData.name;
                return (
                  <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-semibold text-slate-500 mb-1">{isMine ? 'Tú' : msg.user} ({msg.role})</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${isMine ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'}`}>
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">{msg.timestamp}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-grow px-4 py-2.5 bg-slate-100 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default LiveSupportChat;