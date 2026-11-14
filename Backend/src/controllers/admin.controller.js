import bcrypt from 'bcrypt';
import { turso } from '../config/turso.js';
import { clearLockoutState } from '../services/auth.service.js';
import { validateAcademicFields } from './auth.controller.js';
import { parseId } from '../utils/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getUserRoles = async (userId) => {
  const result = await turso.execute({
    sql: `SELECT r.name FROM Role r JOIN UserRole ur ON ur.roleId = r.id WHERE ur.userId = ?`,
    args: [userId]
  });
  return result.rows.map(r => r.name);
};

/**
 * Resuelve el parámetro `:id` de las rutas de admin.
 *
 * RR-005: además del id numérico, se acepta el **ID único EPN** (9 dígitos)
 * como identificador, para que el panel pueda operar directamente con el
 * número de cédula/pasaporte del estudiante.
 *
 * Prioridad: `User.id` numérico → `User.uniqueId` → `null`.
 *
 * @param {unknown} raw  Valor crudo de `req.params.id`.
 * @returns {Promise<number|null>} Id interno del usuario, o `null`.
 */
const resolveUserIdParam = async (raw) => {
  const numericId = parseId(raw);
  if (numericId !== null) {
    const byId = await turso.execute({
      sql: `SELECT id FROM User WHERE id = ?`,
      args: [numericId]
    });
    if (byId.rows.length) return numericId;
  }

  // No había usuario con ese id numérico (o el id no era numérico):
  // se intenta con el ID único EPN tal cual se envió.
  const uniqueId = String(raw ?? '').trim();
  if (/^\d{9}$/.test(uniqueId)) {
    const byUniqueId = await turso.execute({
      sql: `SELECT id FROM User WHERE uniqueId = ?`,
      args: [uniqueId]
    });
    if (byUniqueId.rows.length) return byUniqueId.rows[0].id;
  }

  return null;
};

// ─── Controladores ────────────────────────────────────────────────────────────

export const getUsers = async (req, res) => {
  try {
    const result = await turso.execute(
      `SELECT id, name, email, isActive, isLocked, career, semester, uniqueId, xp, level, createdAt
       FROM User ORDER BY createdAt DESC`
    );

    const users = await Promise.all(result.rows.map(async (user) => ({
      ...user,
      roles: await getUserRoles(user.id)
    })));

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, roleName, career, semester, uniqueId } = req.body;

    if (!name || !email || !password || !roleName) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // RR-005: el identificador único (9 dígitos) es opcional, pero si viene
    // debe ser válido y estar libre.
    const academicError = validateAcademicFields({ career, semester, uniqueId });
    if (academicError) {
      return res.status(400).json({ error: academicError });
    }

    const normalizedUniqueId = uniqueId !== undefined && uniqueId !== null && uniqueId !== ''
      ? String(uniqueId).trim()
      : null;

    if (normalizedUniqueId) {
      const existing = await turso.execute({
        sql: `SELECT id FROM User WHERE uniqueId = ?`,
        args: [normalizedUniqueId]
      });
      if (existing.rows.length) {
        return res.status(409).json({ error: 'Este identificador único ya está registrado.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await turso.execute({
      sql: `INSERT INTO User (name, email, password, career, semester, uniqueId, isVerified, isActive)
            VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      args: [
        name,
        email,
        hashedPassword,
        career !== undefined && career !== null && career !== '' ? String(career).trim() : null,
        semester !== undefined && semester !== null && semester !== '' ? Number(semester) : null,
        normalizedUniqueId
      ]
    });

    const userResult = await turso.execute({ sql: `SELECT * FROM User WHERE email = ?`, args: [email] });
    const newUser    = userResult.rows[0];

    const roleResult = await turso.execute({ sql: `SELECT id FROM Role WHERE name = ?`, args: [roleName] });
    if (roleResult.rows.length) {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO UserRole (userId, roleId) VALUES (?, ?)`,
        args: [newUser.id, roleResult.rows[0].id]
      });
    }

    res.status(201).json({ message: 'Usuario creado con éxito', user: { ...newUser, password: undefined } });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      if (error.message.includes('uniqueId')) {
        return res.status(409).json({ error: 'Este identificador único ya está registrado.' });
      }
      return res.status(400).json({ error: 'Este correo ya está registrado.' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, roleName, career, semester, uniqueId } = req.body;

    // RR-005: se acepta tanto el id numérico como el ID único EPN (9 dígitos).
    const userId = await resolveUserIdParam(id);
    if (userId === null) {
      return res.status(400).json({ error: 'El identificador de usuario no es válido.' });
    }

    // RR-003 / RR-005: carrera, semestre e identificador único editables.
    const academicError = validateAcademicFields({ career, semester, uniqueId });
    if (academicError) {
      return res.status(400).json({ error: academicError });
    }

    let updateSql = `UPDATE User SET name = ?, email = ?, updatedAt = datetime('now')`;
    let updateArgs = [name, email];

    if (career !== undefined) {
      updateSql += `, career = ?`;
      updateArgs.push(career === null || career === '' ? null : String(career).trim());
    }

    if (semester !== undefined) {
      updateSql += `, semester = ?`;
      updateArgs.push(semester === null || semester === '' ? null : Number(semester));
    }

    if (uniqueId !== undefined) {
      const normalizedUniqueId = uniqueId === null || uniqueId === '' ? null : String(uniqueId).trim();

      if (normalizedUniqueId) {
        // Rechazar 409 si el identificador pertenece a OTRO usuario.
        const existing = await turso.execute({
          sql: `SELECT id FROM User WHERE uniqueId = ? AND id != ?`,
          args: [normalizedUniqueId, userId]
        });
        if (existing.rows.length) {
          return res.status(409).json({ error: 'Este identificador único ya está registrado.' });
        }
      }

      updateSql += `, uniqueId = ?`;
      updateArgs.push(normalizedUniqueId);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateSql += `, password = ?`;
      updateArgs.push(hashedPassword);
    }

    updateSql += ` WHERE id = ?`;
    updateArgs.push(userId);

    await turso.execute({
      sql: updateSql,
      args: updateArgs
    });

    if (roleName) {
      const roleResult = await turso.execute({ sql: `SELECT id FROM Role WHERE name = ?`, args: [roleName] });
      if (roleResult.rows.length) {
        const roleId = roleResult.rows[0].id;
        await turso.execute({
          sql: `DELETE FROM UserRole WHERE userId = ?`,
          args: [userId]
        });
        await turso.execute({
          sql: `INSERT INTO UserRole (userId, roleId) VALUES (?, ?)`,
          args: [userId, roleId]
        });
      }
    }

    const result = await turso.execute({ sql: `SELECT id, name, email FROM User WHERE id = ?`, args: [userId] });
    res.json({ message: 'Usuario actualizado', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = parseId(id);
    if (userId === null) {
      return res.status(400).json({ error: 'El identificador de usuario no es válido.' });
    }

    const result = await turso.execute({ sql: `SELECT id, isActive FROM User WHERE id = ?`, args: [userId] });
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const newStatus = result.rows[0].isActive ? 0 : 1;

    await turso.execute({
      sql: `UPDATE User SET isActive = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [newStatus, userId]
    });

    res.json({ message: `Usuario ${newStatus ? 'activado' : 'desactivado'}` });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
};

export const unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = parseId(id);
    if (userId === null) {
      return res.status(400).json({ error: 'El identificador de usuario no es válido.' });
    }

    const result = await turso.execute({ sql: `SELECT id, name, email FROM User WHERE id = ?`, args: [userId] });
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Reinicia TODO el estado de bloqueo (isLocked, lockoutUntil,
    // lockoutCount y failedAttempts).
    await clearLockoutState(userId);

    res.json({ message: `Cuenta de ${result.rows[0].email} desbloqueada exitosamente.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al desbloquear usuario' });
  }
};

/**
 * Resumen de progreso de un usuario para el panel de administración (RR-004).
 * GET /api/admin/users/:id/progress
 *
 * Antes el admin solo veía la lista plana de usuarios, sin poder consultar los
 * avances de cada estudiante.
 */
export const getUserProgress = async (req, res) => {
  try {
    // RR-005: acepta id numérico o ID único EPN, igual que el resto del panel.
    const userId = await resolveUserIdParam(req.params.id);
    if (userId === null) {
      return res.status(400).json({ error: 'El identificador de usuario no es válido.' });
    }

    const userResult = await turso.execute({
      sql: `SELECT id, name, email, career, semester, uniqueId, xp, level, streak, isActive
            FROM User WHERE id = ?`,
      args: [userId]
    });

    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = userResult.rows[0];

    const modulesResult = await turso.execute({
      sql: `SELECT COUNT(*) AS total,
                   SUM(CASE WHEN isPassed = 1 THEN 1 ELSE 0 END) AS passed,
                   AVG(score) AS avgScore
            FROM ModuleProgress WHERE userId = ?`,
      args: [userId]
    });
    const modules = modulesResult.rows[0] || {};

    const routesResult = await turso.execute({
      sql: `SELECT lr.id, lr.title, lr.category, e.progress, e.createdAt AS enrolledAt
            FROM Enrollment e
            JOIN LearningRoute lr ON lr.id = e.learningRouteId
            WHERE e.userId = ?
            ORDER BY e.createdAt DESC`,
      args: [userId]
    });
    const routes = routesResult.rows;

    res.json({
      user: {
        ...user,
        roles: await getUserRoles(user.id)
      },
      progress: {
        points: user.xp,
        level: user.level,
        streak: user.streak,
        modulesCompleted: Number(modules.total || 0),
        modulesPassed: Number(modules.passed || 0),
        averageScore: modules.avgScore !== null && modules.avgScore !== undefined
          ? Math.round(Number(modules.avgScore))
          : null,
        routesEnrolled: routes.length,
        averageProgress: routes.length
          ? Math.round(routes.reduce((sum, r) => sum + (r.progress || 0), 0) / routes.length)
          : 0,
        routes
      }
    });
  } catch (error) {
    console.error('Error en getUserProgress:', error);
    res.status(500).json({ error: 'Error al obtener el progreso del usuario.' });
  }
};