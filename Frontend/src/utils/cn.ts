export type ClassValue =
  | ClassValue[]
  | Record<string, boolean | null | undefined>
  | string
  | number
  | false
  | null
  | undefined;

/**
 * Une clases condicionales sin dependencias externas.
 *
 * No implementa resolución de conflictos tipo `tailwind-merge`: si dos
 * clases afectan la misma propiedad, gana la que aparezca después en la
 * hoja de estilos generada, no la que esté al final del string. Por eso la
 * convención del proyecto es:
 *
 * - Las variantes del componente definen color, tipografía y padding.
 * - El `className` del consumidor solo debe usarse para layout
 *   (márgenes, ancho, grid, posicionamiento).
 */
export function cn(...values: ClassValue[]): string {
  const classes: string[] = [];

  const push = (value: ClassValue) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }

    if (typeof value === 'object') {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) classes.push(key);
      }
      return;
    }

    classes.push(String(value));
  };

  values.forEach(push);

  return classes.join(' ');
}
