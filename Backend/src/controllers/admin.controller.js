import bcrypt from 'bcrypt';
import { turso } from '../config/turso.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getUserRoles = async (userId) => {
  const result = await turso.execute({
    sql: `SELECT r.name FROM Role r JOIN UserRole ur ON ur.roleId = r.id WHERE ur.userId = ?`,
    args: [userId]
  });
  return result.rows.map(r => r.name);
};

// ─── Controladores ────────────────────────────────────────────────────────────

export const getUsers = async (req, res) => {
  try {
    const result = await turso.execute(
      `SELECT id, name, email, isActive, isLocked, createdAt FROM User ORDER BY createdAt DESC`
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
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password || !roleName) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await turso.execute({
      sql: `INSERT INTO User (name, email, password, isVerified, isActive) VALUES (?, ?, ?, 1, 1)`,
      args: [name, email, hashedPassword]
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
      return res.status(400).json({ error: 'Este correo ya está registrado.' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, roleName } = req.body;

    let updateSql = `UPDATE User SET name = ?, email = ?, updatedAt = datetime('now')`;
    let updateArgs = [name, email];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateSql += `, password = ?`;
      updateArgs.push(hashedPassword);
    }
    
    updateSql += ` WHERE id = ?`;
    updateArgs.push(parseInt(id));

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
          args: [parseInt(id)]
        });
        await turso.execute({
          sql: `INSERT INTO UserRole (userId, roleId) VALUES (?, ?)`,
          args: [parseInt(id), roleId]
        });
      }
    }

    const result = await turso.execute({ sql: `SELECT id, name, email FROM User WHERE id = ?`, args: [parseInt(id)] });
    res.json({ message: 'Usuario actualizado', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await turso.execute({ sql: `SELECT id, isActive FROM User WHERE id = ?`, args: [parseInt(id)] });
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const newStatus = result.rows[0].isActive ? 0 : 1;

    await turso.execute({
      sql: `UPDATE User SET isActive = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [newStatus, parseInt(id)]
    });

    res.json({ message: `Usuario ${newStatus ? 'activado' : 'desactivado'}` });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
};

export const unlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await turso.execute({ sql: `SELECT id, name, email FROM User WHERE id = ?`, args: [parseInt(id)] });
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await turso.execute({
      sql: `UPDATE User SET isLocked = 0, unlockToken = NULL, failedAttempts = 0, lockoutUntil = NULL, lockoutCount = 0, updatedAt = datetime('now') WHERE id = ?`,
      args: [parseInt(id)]
    });

    res.json({ message: `Cuenta de ${result.rows[0].email} desbloqueada exitosamente.` });
  } catch (error) {
    res.status(500).json({ error: 'Error al desbloquear usuario' });
  }
};