import { turso } from '../config/turso.js';

/**
 * Analítica de estudio del estudiante.
 *
 * Los datos salen de Turso (`ModuleProgress` + `LearningRoute.estimatedTime`).
 * Antes el panel de analítica pintaba una actividad semanal inventada
 * (valores hardcodeados en el frontend), así que mostraba 45/120/30... minutos
 * que no correspondían a nada.
 */

/** Etiquetas de los días de la semana en el orden que usa el gráfico. */
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

/**
 * Minutos de estudio estimados para un módulo.
 *
 * `LearningRoute.estimatedTime` es el tiempo de la ruta completa, así que se
 * reparte entre sus módulos. Si la ruta no lo declara, se usa 30 min como
 * valor por defecto (la misma suposición que usa el grafo curricular).
 */
const DEFAULT_MODULE_MINUTES = 30;

/**
 * GET /api/analytics/weekly-activity
 *
 * Minutos de estudio del calendario actual (lunes → domingo).
 */
export const getWeeklyActivity = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lunes de la semana en curso.
    // `strftime('%w')` da 0 para domingo y 1 para lunes: `(w + 6) % 7` son los
    // días transcurridos desde el lunes.
    const result = await turso.execute({
      sql: `SELECT
              date(mp.completedAt) AS day,
              SUM(
                CASE
                  WHEN lr.estimatedTime IS NOT NULL AND lr.estimatedTime > 0 AND mq.totalModules > 0
                    THEN CAST(lr.estimatedTime AS REAL) / mq.totalModules
                  ELSE ${DEFAULT_MODULE_MINUTES}
                END
              ) AS minutes,
              COUNT(*) AS completedModules
            FROM ModuleProgress mp
            JOIN Module m ON m.id = mp.moduleId
            JOIN LearningRoute lr ON lr.id = m.routeId
            JOIN (
              SELECT routeId, COUNT(*) AS totalModules
              FROM Module
              GROUP BY routeId
            ) mq ON mq.routeId = m.routeId
            WHERE mp.userId = ?
              AND mp.isPassed = 1
              AND date(mp.completedAt) >= date('now', '-' || ((strftime('%w','now') + 6) % 7) || ' days')
            GROUP BY date(mp.completedAt)
            ORDER BY day ASC`,
      args: [userId]
    });

    const minutesByDay = new Map();
    const modulesByDay = new Map();

    for (const row of result.rows) {
      const day = row.day;
      const minutes = Number(row.minutes ?? 0);
      minutesByDay.set(day, Math.round(minutes));
      modulesByDay.set(day, Number(row.completedModules ?? 0));
    }

    // Se devuelven los 7 días de la semana, aunque no haya actividad: el
    // gráfico necesita una serie estable.
    //
    // TODO en UTC (igual que el SQL) y no en hora local: mezclar las dos
    // desplazaba la serie un día a partir de las 19:00 en Ecuador, y el lunes
    // real desaparecía del gráfico.
    const now = new Date();
    const daysSinceMonday = (now.getUTCDay() + 6) % 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
    monday.setUTCHours(0, 0, 0, 0);

    const weeklyActivity = Array.from({ length: 7 }, (_unused, index) => {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + index);

      const isoDay = date.toISOString().slice(0, 10);
      return {
        day: DAY_LABELS[date.getUTCDay()],
        minutes: minutesByDay.get(isoDay) ?? 0,
        completedModules: modulesByDay.get(isoDay) ?? 0,
      };
    });

    return res.json({
      success: true,
      weeklyActivity,
      totalMinutes: weeklyActivity.reduce((acc, day) => acc + day.minutes, 0),
      totalCompletedModules: weeklyActivity.reduce((acc, day) => acc + day.completedModules, 0)
    });
  } catch (error) {
    console.error('Error en getWeeklyActivity:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar la actividad semanal.' });
  }
};
