import { describe, expect, it } from 'vitest';

/**
 * Guardián de la paleta corporativa (S2, S4, S6).
 *
 * El sistema admite únicamente el rojo corporativo y la escala neutra.
 * Este archivo hace fallar la suite si vuelve a entrar un tono cromático
 * amarillo, azul o verde en clases de Tailwind o en los tokens globales.
 *
 * La lectura de archivos usa `import.meta.glob` con `?raw` en lugar de
 * `node:fs`: el `tsconfig.json` no declara tipos de Node y esta ruta no
 * necesita ampliar el alcance de las dependencias del proyecto.
 */

/** Este propio archivo declara los tonos prohibidos; no puede escanearse. */
const SELF = './palette.test.ts';

/** Tonos cromáticos vetados por la paleta corporativa. */
const FORBIDDEN_HUES = [
  'green',
  'emerald',
  'lime',
  'teal',
  'amber',
  'yellow',
  'orange',
  'blue',
  'sky',
  'cyan',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

const FORBIDDEN_PATTERN = new RegExp(
  `(?:^|[^a-z0-9])(${FORBIDDEN_HUES.join('|')})-[0-9]{2,3}\\b`,
  'g'
);

/** Contenido crudo de cada fuente bajo `src/`, indexado por ruta relativa. */
const sources: Record<string, string> = import.meta.glob(
  ['./**/*.ts', './**/*.tsx', './**/*.css'],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

const SOURCE_ENTRIES = Object.entries(sources).filter(([file]) => file !== SELF);

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

const findForbiddenClasses = (): Violation[] => {
  const violations: Violation[] = [];

  for (const [file, content] of SOURCE_ENTRIES) {
    content.split(/\r?\n/).forEach((line, index) => {
      FORBIDDEN_PATTERN.lastIndex = 0;
      if (FORBIDDEN_PATTERN.test(line)) {
        violations.push({
          file,
          line: index + 1,
          snippet: line.trim().slice(0, 160),
        });
      }
    });
  }

  return violations;
};

const theme = sources['./index.css'] ?? '';

const readRamp = (name: string): Record<string, string> => {
  const ramp: Record<string, string> = {};
  const pattern = new RegExp(`--color-${name}-(\\d{2,3}):\\s*(#[0-9a-fA-F]{6})`, 'g');

  for (const match of theme.matchAll(pattern)) {
    ramp[match[1]] = match[2].toLowerCase();
  }

  return ramp;
};

/** Familias cromáticas declaradas en `@theme` (`--color-<familia>-<paso>`). */
const readColorFamilies = (): string[] => {
  const families = new Set<string>();

  for (const match of theme.matchAll(/--color-([a-z]+)-\d{2,3}:/g)) {
    families.add(match[1]);
  }

  return [...families].sort();
};

/** Archivos que aún referencian la rampa `accent` eliminada. */
const findAccentUsages = (): string[] =>
  SOURCE_ENTRIES.filter(([, content]) => /(^|[^a-z0-9])accent-[0-9]{2,3}\b/.test(content)).map(
    ([file]) => file
  );

describe('paleta corporativa', () => {
  it('no usa tonos cromáticos prohibidos en componentes ni tokens', () => {
    const violations = findForbiddenClasses();
    const report = violations
      .slice(0, 25)
      .map((v) => `${v.file}:${v.line} -> ${v.snippet}`)
      .join('\n');

    expect(violations, `Tonos vetados por S2:\n${report}`).toHaveLength(0);
  });

  it('la rampa primary es el rojo corporativo (alias de brand)', () => {
    const primary = readRamp('primary');
    const brand = readRamp('brand');

    expect(Object.keys(primary).length).toBeGreaterThan(0);
    expect(primary).toEqual(brand);
  });

  it('solo declara las familias brand, primary y surface', () => {
    expect(readColorFamilies()).toEqual(['brand', 'primary', 'surface']);
  });

  it('no conserva referencias a la rampa accent eliminada', () => {
    expect(findAccentUsages()).toEqual([]);
  });
});
