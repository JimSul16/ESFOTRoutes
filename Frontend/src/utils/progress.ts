/**
 * Cálculo del progreso de XP.
 *
 * El backend calcula el nivel como `Math.floor(xp / 1000) + 1`
 * (`routes.controller.js`, `completeModule`). Antes el frontend usaba el XP
 * **total** contra el XP del nivel, así que con 5 000 XP y nivel 5 la barra
 * decía "5000 / 1000 XP" y se veía al 100 %: la barra mentía.
 */

/** XP que cuesta subir de nivel. */
export const XP_PER_LEVEL = 1000;

/**
 * Progreso dentro del nivel actual.
 *
 * @param xp        XP total acumulada.
 * @param level     Nivel actual (el backend usa `floor(xp / 1000) + 1`).
 * @returns `{ xpInLevel, xpNeeded, percent }` — `percent` va de 0 a 100.
 */
export const levelProgress = (xp = 0, level = 1) => {
  const totalXp = Number(xp) || 0;
  const currentLevel = Math.max(1, Number(level) || 1);

  // El XP acumulado en los niveles anteriores.
  const baseXp = (currentLevel - 1) * XP_PER_LEVEL;
  const xpInLevel = Math.max(0, totalXp - baseXp);
  const xpNeeded = Math.max(XP_PER_LEVEL - xpInLevel, 0);
  const percent = Math.min(Math.round((xpInLevel / XP_PER_LEVEL) * 100), 100);

  return { xpInLevel, xpNeeded, percent, totalXp };
};
