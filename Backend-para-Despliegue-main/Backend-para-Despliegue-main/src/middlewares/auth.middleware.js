import jwt from 'jsonwebtoken';
import { turso } from '../config/turso.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

export const checkRoles = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
      }

      const rawId  = req.user.id || req.user.userId || req.user.sub;
      const userId = parseInt(rawId);

      if (!userId || isNaN(userId)) {
        return res.status(403).json({ error: 'Acceso denegado. ID inválido en el token.' });
      }

      // Verificar que el usuario existe y está activo
      const userResult = await turso.execute({
        sql: `SELECT id, isActive FROM User WHERE id = ?`,
        args: [userId]
      });

      if (!userResult.rows.length) {
        return res.status(403).json({ error: 'Acceso denegado. Usuario no encontrado en la DB.' });
      }

      if (!userResult.rows[0].isActive) {
        return res.status(403).json({ error: 'Acceso denegado. Usuario desactivado.' });
      }

      // Obtener roles del usuario
      const rolesResult = await turso.execute({
        sql: `SELECT r.name FROM Role r JOIN UserRole ur ON ur.roleId = r.id WHERE ur.userId = ?`,
        args: [userId]
      });

      const userRoles = rolesResult.rows.map(r => r.name);

      if (!userRoles.length) {
        return res.status(403).json({ error: 'Acceso denegado. El usuario no tiene roles.' });
      }

      const hasRole = userRoles.some(role => allowedRoles.includes(role));
      if (!hasRole) {
        return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
      }

      next();
    } catch (error) {
      console.error('Error en middleware checkRoles:', error);
      return res.status(500).json({ error: 'Error al verificar permisos.' });
    }
  };
};