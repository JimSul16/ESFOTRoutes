import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';

const CodeWorkspace = ({ onSendToAI, challengeData }) => {
  const isMultiTask = !!challengeData?.tasks && challengeData.tasks.length > 0;
  
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskData, setTaskData] = useState({});
  const [submitWarning, setSubmitWarning] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [inputData, setInputData] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isMultiTask) {
      setActiveTaskId(challengeData.tasks[0].id);
      const initialTaskData = {};
      challengeData.tasks.forEach(t => {
        initialTaskData[t.id] = { mode: 'code', language: 'javascript', content: '', file: null };
      });
      setTaskData(initialTaskData);
    }
  }, [challengeData, isMultiTask]);

  const languages = [
    { id: 'python', name: 'Python' },
    { id: 'cpp', name: 'C++' },
    { id: 'java', name: 'Java' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'html', name: 'HTML / Web' },
    { id: 'sql', name: 'SQL / Bases de Datos' },
    { id: 'shell', name: 'Bash / Terminal' },
    { id: 'json', name: 'JSON / Configs' },
    { id: 'markdown', name: 'Markdown / Texto Libre' }
  ];

  const isCompilable = ['python', 'cpp', 'java', 'javascript'].includes(
    isMultiTask ? taskData[activeTaskId]?.language || 'javascript' : language
  );

  const handleTaskDataChange = (taskId, field, value) => {
    setTaskData(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Compilando código...');

    const runLang = isMultiTask ? taskData[activeTaskId].language : language;
    const runCode = isMultiTask ? taskData[activeTaskId].content : code;

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${backendUrl}/execute/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          language: runLang, 
          code: runCode,
          stdin: inputData 
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.stderr) {
          setOutput(`Error:\n${data.stderr}`);
        } else {
          setOutput(data.output || 'Programa ejecutado sin salida en consola.');
        }
      } else {
        setOutput(`Error del servidor:\n${data.error}`);
      }
    } catch (error) {
      setOutput('Error de red: No se pudo conectar con el servidor.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleEvaluate = () => {
    if (isMultiTask) {
      const emptyTasks = challengeData.tasks.filter(t => {
        const td = taskData[t.id] || {};
        if (td.mode === 'file') return !td.file;
        return !(td.content || '').trim();
      });

      if (emptyTasks.length > 0 && !submitWarning) {
        setSubmitWarning(true);
        setIsHolding(true);
        toast.warning(`¡Atención! Tienes ${emptyTasks.length} tarea(s) vacía(s). Podrás forzar el envío en 5 segundos.`);
        setTimeout(() => setIsHolding(false), 5000);
        return;
      }

      let finalPayload = `HE COMPLETADO EL RETO INTEGRADO: ${challengeData.title || 'Práctica'}\n\n`;
      challengeData.tasks.forEach((t, i) => {
        const td = taskData[t.id] || {};
        finalPayload += `--- TAREA ${i + 1} ---\nInstrucción: ${t.description}\n`;
        if (td.mode === 'file' && td.file) {
          finalPayload += `Evidencia adjunta: [El estudiante seleccionó el archivo / imagen: ${td.file.name}]\n\n`;
        } else if (td.content && td.content.trim()) {
          finalPayload += `Respuesta del estudiante:\n\`\`\`${td.language}\n${td.content}\n\`\`\`\n\n`;
        } else {
          finalPayload += `Respuesta del estudiante: [No respondió / Vacío]\n\n`;
        }
      });

      onSendToAI(finalPayload, 'multitask', 'N/A');
      setSubmitWarning(false);
      setIsHolding(false);

    } else {
      if (!code.trim()) return;
      onSendToAI(code, language, output);
    }
  };

  const currentEditorCode = isMultiTask ? (taskData[activeTaskId]?.content || '') : code;
  const currentEditorLang = isMultiTask ? (taskData[activeTaskId]?.language || 'javascript') : language;

  return (
    <div className="flex flex-col h-[700px] w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl bg-[#0f111a] ring-1 ring-white/10">
      
      {isMultiTask && (
        <div className="flex flex-col border-b border-slate-800/80 bg-[#12141c]">
          <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-800/80">
            {challengeData.tasks.map((task, idx) => (
              <button
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`flex-shrink-0 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTaskId === task.id 
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5' 
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                Tarea {idx + 1}
              </button>
            ))}
          </div>
          <div className="p-4 bg-[#1a1d27] flex flex-col gap-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              {challengeData.tasks.find(t => t.id === activeTaskId)?.description}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleTaskDataChange(activeTaskId, 'mode', 'code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  taskData[activeTaskId]?.mode === 'code' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                📝 Código / Texto
              </button>
              <button 
                onClick={() => handleTaskDataChange(activeTaskId, 'mode', 'file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  taskData[activeTaskId]?.mode === 'file' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🖼️ / 📁 Archivo o Imagen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d27] border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 hidden sm:flex">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
          {(!isMultiTask || taskData[activeTaskId]?.mode === 'code') && (
            <select 
              value={currentEditorLang}
              onChange={(e) => isMultiTask ? handleTaskDataChange(activeTaskId, 'language', e.target.value) : setLanguage(e.target.value)}
              className="bg-[#0f111a] border border-slate-700 text-slate-300 text-xs font-mono rounded-md focus:ring-violet-500 focus:border-violet-500 block px-2 py-1 outline-none cursor-pointer"
            >
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3">
          {(!isMultiTask || taskData[activeTaskId]?.mode === 'code') && (
            <button 
              onClick={handleRunCode}
              disabled={isRunning || !currentEditorCode.trim() || !isCompilable}
              title={!isCompilable ? "Este formato se evalúa mediante IA, no requiere compilación local." : "Ejecutar código"}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg hover:bg-emerald-400/20 disabled:opacity-50 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
              RUN
            </button>
          )}
          <button 
            onClick={handleEvaluate}
            disabled={(isMultiTask ? false : !code.trim()) || isHolding}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-lg disabled:opacity-50 transition-all ${
              submitWarning 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20' 
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20'
            }`}
          >
            {isHolding ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            )}
            {submitWarning && !isHolding ? 'CONFIRMAR ENVÍO INCOMPLETO' : 'EVALUAR CON IA'}
          </button>
        </div>
      </div>

      <div className="flex-grow grid grid-rows-3 lg:grid-rows-1 lg:grid-cols-4 min-h-0">
        
        <div className="row-span-2 lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-800/80 relative">
          {isMultiTask && taskData[activeTaskId]?.mode === 'file' ? (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0a0a0f]">
              <div className="w-24 h-24 mb-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              </div>
              <label className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl cursor-pointer transition-colors font-bold shadow-lg shadow-violet-900/20">
                Seleccionar Archivo o Imagen
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleTaskDataChange(activeTaskId, 'file', e.target.files[0])} 
                />
              </label>
              {taskData[activeTaskId]?.file && (
                <div className="mt-6 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Archivo cargado: {taskData[activeTaskId].file.name}
                </div>
              )}
            </div>
          ) : (
            <Editor
              height="100%"
              language={currentEditorLang}
              theme="vs-dark"
              value={currentEditorCode}
              onChange={(val) => isMultiTask ? handleTaskDataChange(activeTaskId, 'content', val) : setCode(val)}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                fontLigatures: true,
                wordWrap: "on",
                padding: { top: 20, bottom: 20 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
                quickSuggestions: true,
                wordBasedSuggestions: "currentDocument",
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
              }}
            />
          )}
        </div>

        <div className="row-span-1 lg:col-span-1 bg-[#0a0a0f] flex flex-col h-full">
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800/80">
            <div className="px-4 py-2 bg-[#12141c] border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Salida de Consola</span>
              <button onClick={() => setOutput('')} className="text-slate-500 hover:text-slate-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
              <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {output || <span className="text-slate-600 select-none">{isCompilable ? "Esperando ejecución..." : "Modo de evaluación manual. Utiliza 'Evaluar con IA'."}</span>}
              </pre>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 bg-[#12141c] border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Entrada (stdin)</span>
              <button onClick={() => setInputData('')} className="text-slate-500 hover:text-slate-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
            <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 shrink-0">
              <p className="text-amber-500/90 text-[11px] leading-relaxed">
                <strong className="font-bold block mb-0.5">Nota de ejecución:</strong>
                Si tu código requiere múltiples interacciones (ej. menús complejos), pruébalo en tu IDE local.
              </p>
            </div>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              disabled={!isCompilable}
              placeholder={isCompilable ? "Valores de entrada separados por salto de línea..." : "Entrada deshabilitada."}
              className="flex-grow w-full bg-[#0a0a0f] text-slate-300 font-mono text-sm p-4 resize-none outline-none focus:ring-0 placeholder:text-slate-700 disabled:opacity-30"
              spellCheck="false"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeWorkspace;