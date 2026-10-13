import { Button, Badge, type BadgeVariant } from '@/components/ui';
import type { LearningRoute } from '../../../../types';

const getDifficultyColor = (difficulty?: string): BadgeVariant => {
  switch (difficulty) {
    case 'BEGINNER': return 'success';
    case 'INTERMEDIATE': return 'primary';
    case 'ADVANCED': return 'accent';
    case 'ADAPTIVE': return 'accent';
    default: return 'default';
  }
};

const getDifficultyText = (difficulty?: string) => {
  switch (difficulty) {
    case 'BEGINNER': return 'Principiante';
    case 'INTERMEDIATE': return 'Intermedio';
    case 'ADVANCED': return 'Avanzado';
    case 'ADAPTIVE': return '⚡ Adaptativa';
    default: return difficulty;
  }
};

export interface RouteHeaderProps {
  route: LearningRoute;
  isEnrolled: boolean;
  isEnrolling: boolean;
  onEnroll: () => void;
}

const RouteHeader = ({ route, isEnrolled, isEnrolling, onEnroll }: RouteHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <Badge variant={getDifficultyColor(route.difficulty)}>
            {getDifficultyText(route.difficulty)}
          </Badge>
          <Badge variant="default">
            ⏱️ {route.estimatedTime || 0} min estimados
          </Badge>
          {(route.title?.toLowerCase().includes('personalizada') || route.title?.toLowerCase().includes('adaptativa')) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200/60 dark:border-brand-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
              Ruta adaptativa
            </span>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-surface-900 dark:text-surface-100 tracking-tight mb-3">
          {route.title}
        </h2>
        
        <p className="text-surface-600 dark:text-surface-300 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
          {route.description}
        </p>

        <div className="flex items-center gap-4 pt-2">
          {!isEnrolled ? (
            <Button onClick={onEnroll} disabled={isEnrolling} size="lg" className="shadow-xs hover:shadow-brand-500/20">
              {isEnrolling ? 'Procesando inscripción...' : 'Inscribirme en esta ruta'}
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-emerald-200 dark:border-emerald-500/20 shadow-2xs">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              Inscrito en esta ruta
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteHeader;
