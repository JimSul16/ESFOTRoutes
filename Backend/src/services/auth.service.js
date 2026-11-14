import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { turso } from '../config/turso.js';

/**
 * Registra un nuevo usuario con rol STUDENT.
 * Acepta además carrera, semestre e identificador único (RR-003 / RR-005),
 * que son opcionales para no romper el registro actual del frontend.
 * Retorna el objeto del usuario creado.
 */
export const registerUser = async ({ name, email, password, career = null, semester = null, uniqueId = null }) => {
  const hashedPassword    = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await turso.execute({
    sql: `INSERT INTO User (name, email, password, career, semester, uniqueId, verificationToken, isVerified)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    args: [name, email, hashedPassword, career, semester, uniqueId, verificationToken]
  });

  const userResult = await turso.execute({
    sql: `SELECT * FROM User WHERE email = ?`,
    args: [email]
  });
  const newUser = userResult.rows[0];

  // Asignar rol STUDENT (lo crea si no existe)
  await turso.execute({
    sql: `INSERT OR IGNORE INTO Role (name, description) VALUES ('STUDENT', 'Estudiante EPN')`
  });

  const roleResult = await turso.execute({
    sql: `SELECT id FROM Role WHERE name = 'STUDENT'`,
    args: []
  });

  await turso.execute({
    sql: `INSERT OR IGNORE INTO UserRole (userId, roleId) VALUES (?, ?)`,
    args: [newUser.id, roleResult.rows[0].id]
  });

  return newUser;
};

/**
 * Devuelve los correos de los administradores activos, para poder avisarles
 * (p. ej. cuando una cuenta queda bloqueada de forma permanente).
 *
 * Antes el destinatario venía de `FIRST_ADMIN_EMAIL` en el `.env`. Esa variable
 * estaba vacía, así que el aviso NUNCA salía y el bloqueo permanente quedaba
 * sin notificar: la cuenta se quedaba inservible y nadie lo sabía. Ahora el
 * destinatario se deduce de los usuarios que realmente tienen el rol ADMIN.
 *
 * Se excluyen las cuentas desechables de la suite de Postman (prefijo
 * `test.`), que no son administradores reales.
 *
 * @returns {Promise<string[]>}
 */
export const getAdminEmails = async () => {
  const result = await turso.execute({
    sql: `SELECT DISTINCT u.email
            FROM User u
            JOIN UserRole ur ON ur.userId = u.id
            JOIN Role r ON r.id = ur.roleId
           WHERE r.name = 'ADMIN'
             AND u.isActive = 1
             AND u.isLocked = 0
             AND u.email NOT LIKE 'test.%'`,
    args: []
  });

  return result.rows.map((r) => r.email).filter(Boolean);
};

/**
 * Limpia TODO el estado de bloqueo de una cuenta.
 *
 * Se invoca siempre que el usuario demuestra que es dueño de la cuenta:
 *   - reset de contraseña por token (`PATCH /auth/reset-password/:token`)
 *   - cambio de contraseña autenticado (`PUT /auth/change-password`)
 *
 * Sin esto, una cuenta bloqueada de forma permanente (isLocked = 1) quedaba
 * MUERTA: ni la contraseña correcta ni un reset de contraseña permitían volver
 * a entrar, porque el login se cortaba antes de comparar el hash.
 */
export const clearLockoutState = async (userId) => {
  await turso.execute({
    sql: `UPDATE User
          SET failedAttempts = 0,
              lockoutUntil  = NULL,
              lockoutCount  = 0,
              isLocked      = 0,
              unlockToken   = NULL
          WHERE id = ?`,
    args: [userId]
  });
};
