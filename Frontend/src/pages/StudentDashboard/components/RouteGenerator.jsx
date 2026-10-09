import { useState, useRef } from 'react';

const RouteGenerator = ({ onBack }) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [additionalContext, setAdditionalContext] = useState('');
  const [referenceFile, setReferenceFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo es demasiado grande. El límite es 5MB.");
        setReferenceFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setReferenceFile(file);
      setError(null);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!topic.trim()) return;
    if (!additionalContext.trim() && !referenceFile) {
      setError("Obligatorio: Debes proporcionar al menos un enlace base o subir un documento de referencia para que la IA pueda construir los recursos de la ruta.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('difficulty', difficulty);
      formData.append('additionalContext', additionalContext);
      if (referenceFile) {
        formData.append('file', referenceFile);
      }

      const response = await fetch(`${apiUrl}/routes/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar la ruta con IA.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-10 bg-[#1a1d27] rounded-2xl border border-emerald-500/30 shadow-2xl text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">¡Ruta Generada con Éxito!</h2>
        <p className="text-slate-400 mb-8">La IA ha analizado tu solicitud, estructurado los módulos, asignado los recursos y creado el Prompt Maestro de evaluación de forma automática.</p>
        <button 
          onClick={onBack}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
        >
          Ir a Mis Rutas
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Generador de Rutas IA</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Define lo que quieres aprender. Nosotros armamos el temario y los recursos.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleGenerate} className="bg-white dark:bg-[#1a1d27] rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">¿Qué tecnología o tema deseas dominar? <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej. Programación Asíncrona en Node.js, Redes Subnetting VLSM..."
              className="w-full bg-slate-50 dark:bg-[#12141c] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nivel de Dificultad <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-4">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all ${
                    difficulty === level 
                      ? 'bg-violet-600/20 border-violet-500 text-violet-400' 
                      : 'bg-slate-50 dark:bg-[#12141c] border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  {level === 'BEGINNER' ? 'Principiante' : level === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Optimización de Recursos (OBLIGATORIO)</h4>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 mb-3 leading-relaxed">
                  Para mantener la plataforma rápida y gratuita, es <strong>obligatorio</strong> proveer material de referencia. Te agradeceríamos enormemente priorizar el uso de enlaces (documentación oficial, Google Drive, Dropbox, etc.). Usa la subida de archivos físicos solo si es estrictamente necesario.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Enlaces base para la IA</label>
            <textarea 
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows="3"
              placeholder="Pega aquí los enlaces de documentación oficial o repositorio..."
              className="w-full bg-slate-50 dark:bg-[#12141c] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors resize-none mb-4"
            ></textarea>
            
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">O Subir documento de referencia (máx 5MB)</label>
            <div className="flex items-center gap-4">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.txt,.md"
                className="block w-full text-sm text-slate-500 dark:text-slate-400
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-bold
                  file:bg-slate-100 file:text-slate-700
                  dark:file:bg-slate-800 dark:file:text-slate-300
                  hover:file:bg-slate-200 dark:hover:file:bg-slate-700
                  cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-[#12141c]"
              />
              {referenceFile && (
                <button 
                  type="button" 
                  onClick={() => {
                    setReferenceFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="shrink-0 w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !topic.trim() || (!additionalContext.trim() && !referenceFile)}
            className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Procesando con IA...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Generar Ruta Automáticamente
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RouteGenerator;