import { useState } from 'react';
import { toast } from 'react-toastify';
import { completeModule } from '../../../api/route.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { AssessmentData, AssessmentType, CompleteModuleResponse } from '../../../types';

export interface AIAssessmentFormProps {
  assessmentData: AssessmentData;
  onRetake: () => void;
  moduleId: string;
  onAssessmentComplete?: (data: CompleteModuleResponse | null) => void;
  assessmentType: AssessmentType;
}

const AIAssessmentForm = ({
  assessmentData,
  onRetake,
  moduleId,
  onAssessmentComplete,
  assessmentType,
}: AIAssessmentFormProps) => {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = assessmentData.questions ?? [];

  const handleOptionSelect = (questionId: string | number, option: string) => {
    if (submitted) return;
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let currentScore = 0;

    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        currentScore += 1;
      }
    });

    setScore(currentScore);
    setSubmitted(true);

    const percentage = questions.length === 0 ? 0 : Math.round((currentScore / questions.length) * 100);
    const isPassed = percentage >= 70;

    if (!isPassed) {
      try {
        await completeModule({ moduleId, score: percentage, passed: false });
      } catch (_) {
        // Fallo no bloqueante de telemetría
      }
      toast.warning(`Obtuviste ${percentage}%. Se registró la retroalimentación en el Grafo Curricular para reforzar estos temas. Revisa las respuestas y vuelve a intentarlo.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await completeModule({ moduleId, score: percentage, passed: isPassed });

      toast.success(res.message || '¡Módulo completado con éxito! (+50 XP)');
      onAssessmentComplete?.(res);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo registrar el progreso del módulo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePercentage = () =>
    questions.length === 0 ? 0 : Math.round((score / questions.length) * 100);

  return (
    <div className="bg-[#1e2333] border border-gray-800 rounded-3xl p-8 shadow-xl animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span className="text-brand-500">⚡</span> {assessmentType === 'completa' ? 'Reto Final de Certificación IA' : 'Prueba de Conocimiento IA'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">Generado dinámicamente con los recursos del módulo.</p>
        </div>
        {submitted && (
          <div className={`px-4 py-2 rounded-xl font-bold border ${calculatePercentage() >= 70 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
            Nota: {score} / {questions.length} ({calculatePercentage()}%)
          </div>
        )}
      </div>

      <div className="space-y-8">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-[#0f172a] rounded-2xl p-6 border border-gray-800 relative overflow-hidden">
            {submitted && (
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${answers[q.id] === q.correctAnswer ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            )}
            
            <div className="flex gap-4 mb-4">
              <span className="bg-brand-600/20 text-brand-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                {index + 1}
              </span>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                  {q.type === 'true_false' ? 'Verdadero o Falso' : 'Opción Múltiple'}
                </span>
                <h3 className="text-lg font-medium text-white leading-relaxed">{q.question}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
              {q.options.map((opt, i) => {
                const isSelected = answers[q.id] === opt;
                const isCorrect = q.correctAnswer === opt;
                let optionClasses = "p-4 rounded-xl border text-sm font-medium transition-all text-left ";
                
                if (!submitted) {
                  optionClasses += isSelected 
                    ? "bg-brand-600/20 border-brand-500 text-brand-300 ring-1 ring-brand-500" 
                    : "bg-[#1e2333] border-gray-700 text-gray-300 hover:border-brand-500/50 hover:bg-[#252b3e] cursor-pointer";
                } else {
                  if (isCorrect) {
                    optionClasses += "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                  } else if (isSelected && !isCorrect) {
                    optionClasses += "bg-red-500/20 border-red-500 text-red-300";
                  } else {
                    optionClasses += "bg-[#1e2333] border-gray-800 text-gray-600 opacity-50";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(q.id, opt)}
                    disabled={submitted}
                    className={optionClasses}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="mt-4 pl-12">
                <div className="bg-[#161a27] border border-gray-800 rounded-lg p-4 text-sm text-gray-400">
                  <span className="font-bold text-brand-400 block mb-1">Explicación del Profesor:</span>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end gap-4 border-t border-gray-800 pt-6">
        {submitted ? (
          <button
            onClick={onRetake}
            className="px-6 py-3 bg-[#1e2333] hover:bg-[#252b3e] text-white border border-gray-700 rounded-xl font-bold transition-colors"
          >
            Cerrar Prueba
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || isSubmitting}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-900/20 flex items-center gap-2"
          >
            {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>}
            Entregar Evaluación
          </button>
        )}
      </div>
    </div>
  );
};

export default AIAssessmentForm;