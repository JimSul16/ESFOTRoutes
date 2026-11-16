/**
 * Configuración mínima de Tailwind.
 *
 * Los tokens de diseño (colores, tipografías, radios, sombras y tamaños de
 * texto) viven únicamente en `src/index.css` dentro del bloque `@theme`.
 * No los dupliques aquí: antes ambos archivos declaraban la misma paleta y
 * cualquier token agregado solo en uno de ellos se rompía en silencio.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
};
