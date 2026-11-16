import type { BadgeVariant } from '@/components/ui/Badge';
import type { IconName } from '@/components/ui/Icon';
import type { Difficulty } from '@/types';

/**
 * Mapa único de etiquetas y semántica visual.
 *
 * Antes el mismo dato se pintaba distinto según la pantalla: la dificultad
 * era verde/celeste/rojo en `RouteExplorer`, success/primary/accent en
 * `RouteHeader` y gris en `RoutesViewer`. Cualquier etiqueta nueva debe
 * agregarse aquí y consumirse desde este módulo.
 */

export interface MetaDescriptor {
  label: string;
  variant: BadgeVariant;
  icon: IconName;
}

const DIFFICULTY_META: Record<Difficulty, MetaDescriptor> = {
  BEGINNER: { label: 'Principiante', variant: 'default', icon: 'sprout' },
  INTERMEDIATE: { label: 'Intermedio', variant: 'warning', icon: 'signal' },
  ADVANCED: { label: 'Avanzado', variant: 'brand', icon: 'flame' },
  ADAPTIVE: { label: 'Adaptativa', variant: 'accent', icon: 'sparkles' },
};

const DIFFICULTY_KEYS = Object.keys(DIFFICULTY_META) as Difficulty[];

/**
 * Devuelve la etiqueta y el tono de una dificultad.
 *
 * Acepta `string` porque el backend puede enviar valores nuevos o nulos;
 * en ese caso se conserva el texto recibido con un tono neutro.
 */
export const getDifficultyMeta = (difficulty?: string | null): MetaDescriptor => {
  if (difficulty && DIFFICULTY_KEYS.includes(difficulty as Difficulty)) {
    return DIFFICULTY_META[difficulty as Difficulty];
  }

  return {
    label: difficulty?.trim() || 'General',
    variant: 'default',
    icon: 'layers',
  };
};

/* -------------------------------------------------------------------------- */
/* Tipos de módulo de las rutas adaptativas                                    */
/* -------------------------------------------------------------------------- */

/**
 * `graphAlgorithm.js` arma los títulos de la ruta adaptativa:
 *   "Módulo 2: Nivelación y Refuerzo Focalizado"
 *   "Módulo 1: Validación y Maestría Práctica de ..."
 *   "Módulo 3: Dominio Práctico de ..."
 *   "Módulo 1: Convalidación y Repaso de Conceptos Dominados"
 * La tabla `Module` no guarda un campo de tipo, así que la única señal
 * disponible en el frontend es el título.
 */
export type ModuleTone = 'reinforcement' | 'mastery' | 'practice' | 'standard';

export interface ModuleToneMeta extends MetaDescriptor {
  /** Color del rail lateral que identifica el módulo de un vistazo. */
  rail: string;
  /** Estilos del contador numérico del módulo. */
  counter: string;
}

/**
 * Paleta del proyecto: `brand` (rojo corporativo) para el módulo troncal,
 * rojo sólido para práctica consolidada, grafito para refuerzo sugerido y
 * grafito sólido para el módulo acreditado.
 */
export const MODULE_TONE_META: Record<ModuleTone, ModuleToneMeta> = {
  reinforcement: {
    label: 'Refuerzo sugerido',
    variant: 'accent',
    icon: 'zap',
    rail: 'bg-surface-400',
    counter:
      'bg-surface-100 text-surface-700 border-surface-300 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-600',
  },
  mastery: {
    label: 'Dominio avanzado acreditado',
    variant: 'success',
    icon: 'star',
    rail: 'bg-surface-900 dark:bg-surface-100',
    counter:
      'bg-surface-900 text-surface-50 border-surface-900 dark:bg-surface-100 dark:text-surface-900 dark:border-surface-100',
  },
  practice: {
    label: 'Práctica consolidada',
    variant: 'primary',
    icon: 'sparkles',
    rail: 'bg-brand-700',
    counter:
      'bg-brand-600 text-white border-brand-600 dark:bg-brand-600 dark:text-white dark:border-brand-600',
  },
  standard: {
    label: 'Módulo troncal',
    variant: 'brand',
    icon: 'bookOpen',
    rail: 'bg-brand-500',
    counter:
      'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/25',
  },
};

/** Normaliza el título (sin acentos y en minúsculas) para poder compararlo. */
const normalizeTitle = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Clasifica el módulo a partir de su título.
 *
 * La clasificación es EXCLUYENTE a propósito: "Dominio Práctico de ..."
 * contiene tanto "dominio" como "practica", así que gana la primera regla
 * que encaja, en orden de especificidad. Antes se pintaban dos etiquetas
 * incompatibles en el mismo encabezado.
 */
export const classifyModule = (title?: string | null): ModuleTone => {
  const normalized = normalizeTitle(title ?? '');
  if (!normalized) return 'standard';
  if (/refuerzo|nivelacion|⚡/.test(normalized)) return 'reinforcement';
  if (/maestria|acreditad|validacion|⭐/.test(normalized)) return 'mastery';
  if (/consolidacion|practica|practico|dominio|✨/.test(normalized)) return 'practice';
  return 'standard';
};

/** Devuelve la metadata visual completa de un módulo según su título. */
export const getModuleToneMeta = (title?: string | null): ModuleToneMeta =>
  MODULE_TONE_META[classifyModule(title)];

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  STUDENT: 'Estudiante',
} as const;

export type KnownRole = keyof typeof ROLE_LABELS;

/** Etiqueta legible de un rol; conserva roles desconocidos tal cual. */
export const getRoleLabel = (role?: string | null): string => {
  if (!role) return '';
  return ROLE_LABELS[role as KnownRole] ?? role;
};

/**
 * Tono de badge de rol: administrador en rojo sólido (mayor énfasis) y
 * estudiante en tinte rojo, para que ambos sigan distinguiéndose sin
 * recurrir a un segundo tono cromático.
 */
const ROLE_TONES: Record<KnownRole, BadgeVariant> = {
  ADMIN: 'warning',
  STUDENT: 'brand',
};

/** Tono de badge de un rol; los roles desconocidos usan el tono neutro. */
export const getRoleTone = (role?: string | null): BadgeVariant => {
  if (role && role in ROLE_TONES) return ROLE_TONES[role as KnownRole];
  return 'default';
};
