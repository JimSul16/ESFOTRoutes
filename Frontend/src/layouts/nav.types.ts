import type { IconName } from '@/components/ui';

export interface NavItem {
  /** Identificador de la pestaña que activa el ítem. */
  tab: string;
  /** Etiqueta completa, usada en el drawer y en la barra lateral. */
  label: string;
  /** Etiqueta corta para la barra inferior (no debe repetir `label`). */
  shortLabel: string;
  icon: IconName;
  /** Si es `false`, el ítem solo aparece en el drawer. */
  primary?: boolean;
}

export interface MobileNavConfig {
  items: NavItem[];
  activeTab: string;
  onNavigate: (tab: string) => void;
  /** Rol que se muestra bajo la marca en el drawer. */
  brandSubtitle: string;
  onLogout: () => void;
  onOpenSelfDiagnosis?: () => void;
  selfDiagnosisLabel?: string;
}
