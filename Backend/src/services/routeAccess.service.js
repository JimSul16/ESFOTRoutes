import { turso } from '../config/turso.js';

/**
 * Política de acceso a rutas de aprendizaje.
 *
 * `checkRoles` decide QUIÉN puede llamar a un endpoint; aquí se decide QUÉ
 * rutas puede tocar. Antes cada controlador repetía (o se olvidaba de) el
 * chequeo `isPublic`/`isAuthor`: `getRouteById`, las evaluaciones del módulo
 * y el chat devolvían el contenido de rutas privadas de otros estudiantes.
 *
 * Regla: se puede leer una ruta si es pública, si es el autor, si es ADMIN
 * o si ya estaba inscrito (protege a quien se inscribió en una ruta de otro
 * estudiante mientras estaba publicada por error).
 */
export class RouteAccessError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Rol ADMIN leído de la BD (el claim del JWT puede tener hasta 24 h). */
export const isAdminUser = async (userId) => {
  const result = await turso.execute({
    sql: `SELECT 1 FROM UserRole ur JOIN Role r ON r.id = ur.roleId
           WHERE ur.userId = ? AND r.name = 'ADMIN' LIMIT 1`,
    args: [userId]
  });
  return result.rows.length > 0;
};

/**
 * @returns {Promise<{id, isPublic, authorId, isEnrolled, isAdmin}>}
 * @throws {RouteAccessError} 404 si no existe, 403 si es privada y ajena.
 */
export const assertRouteAccess = async (userId, routeId) => {
  const result = await turso.execute({
    sql: `SELECT lr.id, lr.isPublic, lr.authorId,
                 EXISTS(SELECT 1 FROM Enrollment e
                         WHERE e.userId = ? AND e.learningRouteId = lr.id) AS isEnrolled,
                 EXISTS(SELECT 1 FROM UserRole ur JOIN Role r ON r.id = ur.roleId
                         WHERE ur.userId = ? AND r.name = 'ADMIN') AS isAdmin
            FROM LearningRoute lr WHERE lr.id = ?`,
    args: [userId, userId, routeId]
  });

  const route = result.rows[0];
  if (!route) throw new RouteAccessError(404, 'Ruta no encontrada.');

  const allowed =
    Boolean(route.isPublic) ||
    Number(route.authorId) === Number(userId) ||
    Boolean(route.isAdmin) ||
    Boolean(route.isEnrolled);

  if (!allowed) {
    console.warn(`🔒 Acceso denegado a la ruta privada ${routeId} (userId ${userId}).`);
    throw new RouteAccessError(403, 'No tienes acceso a esta ruta.');
  }

  return route;
};

/** Misma regla, resuelta desde un módulo (chat, evaluaciones, grafo). */
export const assertModuleAccess = async (userId, moduleId) => {
  const result = await turso.execute({
    sql: `SELECT routeId FROM Module WHERE id = ?`,
    args: [moduleId]
  });
  if (!result.rows.length) throw new RouteAccessError(404, 'Módulo no encontrado.');
  return assertRouteAccess(userId, result.rows[0].routeId);
};

/**
 * Traduce un `RouteAccessError` a la respuesta HTTP.
 * @returns {boolean} `true` si respondió (el controlador debe salir).
 */
export const sendAccessError = (res, error) => {
  if (!(error instanceof RouteAccessError)) return false;
  res.status(error.status).json({ error: error.message });
  return true;
};
