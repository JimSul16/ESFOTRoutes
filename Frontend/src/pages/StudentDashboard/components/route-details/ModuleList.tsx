import ModuleItem from './ModuleItem';
import type { AssessmentType, Module } from '../../../../types';

export interface ModuleListProps {
  modules?: Module[];
  expandedModule: string | null;
  onToggle: (moduleId: string) => void;
  onGenerateAssessment: (moduleId: string, type: AssessmentType) => void;
  isGeneratingAssessment: boolean;
  loadingType?: AssessmentType | null;
}

const ModuleList = ({
  modules,
  expandedModule,
  onToggle,
  onGenerateAssessment,
  isGeneratingAssessment,
  loadingType,
}: ModuleListProps) => {
  if (!modules || modules.length === 0) {
    return (
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl p-8 text-center">
        <p className="text-surface-400">Esta ruta aún no tiene módulos asignados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, index) => (
        <ModuleItem
          key={mod.id}
          module={mod}
          index={index}
          isExpanded={expandedModule === mod.id}
          isLast={index === modules.length - 1}
          onToggle={() => onToggle(mod.id)}
          onGenerateAssessment={onGenerateAssessment}
          isGeneratingAssessment={isGeneratingAssessment}
          loadingType={loadingType}
        />
      ))}
    </div>
  );
};

export default ModuleList;
