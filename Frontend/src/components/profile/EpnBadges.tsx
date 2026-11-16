/**
 * Distintivos identitarios de la Escuela Politécnica Nacional (EPN).
 *
 * Son SVG propios (no provienen de un set externo) para conservar la identidad
 * institucional: el búho representa la sabiduría y el laurel la distinción
 * académica. Todos heredan el color con `currentColor`, son decorativos
 * (`aria-hidden`) y se controlan por clases de tamaño como el resto del
 * sistema de diseño.
 */

export type EpnBadgeName = 'epnOwl' | 'epnLaurel';

export const isEpnBadgeName = (value: string): value is EpnBadgeName =>
  value === 'epnOwl' || value === 'epnLaurel';

interface BadgeGlyphProps {
  className?: string;
}

/** Búho EPN: sabiduría institucional. */
export const EpnOwl = ({ className }: BadgeGlyphProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    {/* Orejas */}
    <path d="M7.6 4.2 6.2 1.9 5.5 5.2" />
    <path d="M16.4 4.2 17.8 1.9 18.5 5.2" />

    {/* Cuerpo redondeado */}
    <path d="M12 20.6c-3.7 0-6.6-2.9-6.6-6.4V9.4c0-3.2 3-5.9 6.6-5.9s6.6 2.7 6.6 5.9v4.8c0 3.5-2.9 6.4-6.6 6.4Z" />

    {/* Ojos */}
    <circle cx="9.3" cy="9.6" r="2.4" />
    <circle cx="14.7" cy="9.6" r="2.4" />

    {/* Pupilas */}
    <circle cx="9.3" cy="9.6" r="0.85" fill="currentColor" stroke="none" />
    <circle cx="14.7" cy="9.6" r="0.85" fill="currentColor" stroke="none" />

    {/* Pico triangular */}
    <path d="M12 11.5 10.8 13.3h2.4Z" fill="currentColor" stroke="none" />

    {/* Alas plegadas */}
    <path d="M7.4 13.2c-.7 1.5-.5 3.1.4 4.4" />
    <path d="M16.6 13.2c.7 1.5.5 3.1-.4 4.4" />
  </svg>
);

/**
 * Hoja canónica del laurel: base en el origen y punta en (4.2, 0). Se coloca
 * con `translate`/`rotate` para mantener las dos ramas simétricas y el código
 * sin repetir trazados.
 */
const LAUREL_LEAF_PATH = 'M0 0C1.3-.9 3-.9 4.2 0 3 .9 1.3 .9 0 0Z';

/** Posición y giro de cada hoja; la rama derecha es el espejo de la izquierda. */
const LAUREL_LEAVES = [
  'translate(6.2 16.4) rotate(-150)',
  'translate(5.4 14) rotate(-120)',
  'translate(5.9 11.6) rotate(-100)',
  'translate(6.9 9.5) rotate(-80)',
  'translate(17.8 16.4) rotate(-30)',
  'translate(18.6 14) rotate(-60)',
  'translate(18.1 11.6) rotate(-80)',
  'translate(17.1 9.5) rotate(-100)',
] as const;

/** Laurel EPN: distinción académica. */
export const EpnLaurel = ({ className }: BadgeGlyphProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    {/* Ramas curvas abiertas por arriba */}
    <path d="M12 20.8C7.9 20.5 5.2 17.2 5.2 13.2c0-1.7.5-3.3 1.5-4.6" />
    <path d="M12 20.8c4.1-.3 6.8-3.6 6.8-7.6 0-1.7-.5-3.3-1.5-4.6" />

    {/* Hojas pareadas */}
    {LAUREL_LEAVES.map((transform) => (
      <path key={transform} d={LAUREL_LEAF_PATH} transform={transform} />
    ))}

    {/* Destello central */}
    <path
      d="M12 6.4l.62 1.98L14.6 9l-1.98.62L12 11.6l-.62-1.98L9.4 9l1.98-.62Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

interface EpnBadgeGlyphProps extends BadgeGlyphProps {
  name: EpnBadgeName;
}

/** Renderiza el distintivo EPN que corresponda al nombre. */
export const EpnBadgeGlyph = ({ name, className }: EpnBadgeGlyphProps) =>
  name === 'epnOwl' ? (
    <EpnOwl className={className} />
  ) : (
    <EpnLaurel className={className} />
  );
