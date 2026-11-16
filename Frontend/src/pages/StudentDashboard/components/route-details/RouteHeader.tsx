import { Button, Badge, Icon } from '@/components/ui';
import { getDifficultyMeta } from '@/utils/uiMaps';
import type { LearningRoute } from '../../../../types';

export interface RouteHeaderProps {
  route: LearningRoute;
  isEnrolled: boolean;
  isEnrolling: boolean;
  onEnroll: () => void;
}

const RouteHeader = ({ route, isEnrolled, isEnrolling, onEnroll }: RouteHeaderProps) => {
  const diffMeta = getDifficultyMeta(route.difficulty);

  return (
    <div className="relative overflow-hidden bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <Badge variant={diffMeta.variant} className="gap-1.5 font-semibold">
            <Icon name={diffMeta.icon} className="h-3.5 w-3.5" />
            {diffMeta.label}
          </Badge>
          <Badge variant="default" className="gap-1.5 font-semibold">
            <Icon name="clock" className="h-3.5 w-3.5 text-surface-500" />
            {route.estimatedTime || 0} min estimados
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
            <div className="inline-flex items-center gap-2 bg-surface-900 dark:bg-surface-100 text-surface-50 dark:text-surface-900 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-surface-900 dark:border-surface-100 shadow-2xs">
              <Icon name="check" className="w-4 h-4" />
              Inscrito en esta ruta
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteHeader;
