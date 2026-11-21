import { turso } from '../config/turso.js';

/**
 * Avance de un usuario sobre una ruta (0-100).
 *
 * - 60 % recursos: recursos únicos abiertos / recursos únicos de la ruta.
 * - 40 % evaluaciones: aprobadas / disponibles (N cuestionarios + 1 reto final).
 *
 * Si la ruta no tiene recursos, las evaluaciones valen el 100 %: con el
 * reparto fijo 60/40 esas rutas se quedaban topadas en 40 %.
 *
 * El reto final (`passedPractice`) solo cuenta en el último módulo: el
 * denominador asume un único reto, así que contarlo en todos los módulos
 * permitía llegar al tope con la mitad del trabajo.
 *
 * Fuente única: la usan `completeModule`, `openResource`, `getMyRoutes`,
 * `getRouteById` y, a través de `Enrollment.progress`, el perfil, el panel
 * de admin y el prompt del tutor.
 */
export const getRouteProgress = async (userId, routeId) => {
  const result = await turso.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM Module WHERE routeId = ?) AS totalModules,
            (SELECT COALESCE(SUM(mp.passedTheory), 0)
               FROM ModuleProgress mp JOIN Module m ON m.id = mp.moduleId
              WHERE mp.userId = ? AND m.routeId = ?) AS passedTheory,
            (SELECT COALESCE(MAX(mp.passedPractice), 0)
               FROM ModuleProgress mp JOIN Module m ON m.id = mp.moduleId
              WHERE mp.userId = ? AND m.routeId = ?
                AND m.position = (SELECT MAX(position) FROM Module WHERE routeId = ?)) AS passedPractice,
            (SELECT COUNT(DISTINCT mr.resourceId)
               FROM ModuleResource mr JOIN Module m ON m.id = mr.moduleId
              WHERE m.routeId = ?) AS totalResources,
            (SELECT COUNT(DISTINCT ra.resourceId)
               FROM ResourceAccess ra
               JOIN ModuleResource mr ON mr.resourceId = ra.resourceId
               JOIN Module m ON m.id = mr.moduleId
              WHERE ra.userId = ? AND m.routeId = ?) AS openedResources`,
    args: [routeId, userId, routeId, userId, routeId, routeId, routeId, userId, routeId]
  });

  const row = result.rows[0] || {};
  const totalModules = Number(row.totalModules || 0);
  if (totalModules === 0) return 0;

  const totalEvaluations = totalModules + 1;
  const passedEvaluations = Number(row.passedTheory || 0) + Number(row.passedPractice || 0);
  const evalRatio = passedEvaluations / totalEvaluations;

  const totalResources = Number(row.totalResources || 0);
  const openedResources = Number(row.openedResources || 0);

  const progress = totalResources > 0
    ? (openedResources / totalResources) * 60 + evalRatio * 40
    : evalRatio * 100;

  return Math.min(100, Math.round(progress));
};

/**
 * Recalcula y guarda `Enrollment.progress` (valor cacheado) de las rutas
 * indicadas. Solo toca filas de inscripción existentes.
 *
 * @returns {Promise<Array<{routeId: number, progress: number}>>}
 */
export const syncEnrollmentProgress = async (userId, routeIds) => {
  const updates = [];
  for (const routeId of routeIds) {
    const progress = await getRouteProgress(userId, routeId);
    updates.push({ routeId: Number(routeId), progress });
  }

  if (updates.length) {
    await turso.batch(
      updates.map(({ routeId, progress }) => ({
        sql: `UPDATE Enrollment SET progress = ? WHERE userId = ? AND learningRouteId = ?`,
        args: [progress, userId, routeId]
      })),
      'write'
    );
  }

  return updates;
};
