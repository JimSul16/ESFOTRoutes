/**
 * Tipos del contenido de la landing page.
 *
 * El copy vive en `landing.data.ts` y el markup en `components/`:
 * este archivo define la forma de ambos para que ninguna sección
 * declare strings de contenido dentro de su JSX (Spec S2).
 */

/** Tono de acento permitido: exclusivamente tokens de `@theme`. */
export type FeatureTone = 'brand' | 'accent' | 'primary';

/** Identificador del icono de una característica (el SVG vive en el componente). */
export type FeatureIcon = 'graph' | 'tutor' | 'progress';

/** Estado visual de un módulo en la vista previa del grafo. */
export type ModuleState = 'done' | 'active' | 'locked';

export interface NavItem {
  label: string;
  href: string;
}

export interface StatItem {
  value: string;
  label: string;
  /** Resalta la cifra con el tono `accent` en lugar del tono base. */
  emphasis?: boolean;
}

export interface FeatureItem {
  icon: FeatureIcon;
  tone: FeatureTone;
  title: string;
  body: string;
  footer: string;
}

export interface StepItem {
  step: string;
  title: string;
  body: string;
}

export interface TeamMember {
  initials: string;
  name: string;
  role: string;
  detail: string;
}

export interface PreviewModule {
  tag: string;
  status: string;
  state: ModuleState;
  /** Etiqueta flotante opcional (p. ej. "En Curso"). */
  badge?: string;
  title: string;
  body: string;
}
