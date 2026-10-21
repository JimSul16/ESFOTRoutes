import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { turso } from '../config/turso.js';

/**
 * Registra un nuevo usuario con rol STUDENT.
 * Retorna el objeto del usuario creado.
 */
export const registerUser = async ({ name, email, password }) => {
  const hashedPassword    = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await turso.execute({
    sql: `INSERT INTO User (name, email, password, verificationToken, isVerified)
          VALUES (?, ?, ?, ?, 0)`,
    args: [name, email, hashedPassword, verificationToken]
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
              unlockToken   = NULL,
              otpAttempts   = 0
          WHERE id = ?`,
    args: [userId]
  });
};

/**
 * Genera un OTP de 6 dígitos y lo guarda en la BD con 10 minutos de expiración.
 *
 * Si ya existe un OTP vigente NO se genera otro: se reutiliza el mismo código.
 * Antes cada nueva petición de login invalidaba el código anterior, así que si
 * el usuario pulsaba "Iniciar Sesión" dos veces (o reenviaba el correo) el
 * código que ya tenía en pantalla dejaba de servir y acababa contando como
 * intento fallido -> bloqueo de la cuenta.
 *
 * @param {string} email
 * @param {{ force?: boolean }} options force=true regenera el código (p. ej. al agotar los intentos de OTP).
 * @returns {Promise<string>} el código vigente.
 */
export const generateOTP = async (email, { force = false } = {}) => {
  const current = await turso.execute({
    sql: `SELECT otpCode, otpExpiresAt FROM User WHERE email = ?`,
    args: [email]
  });

  const row = current.rows[0];
  const stillValid =
    row?.otpCode && row?.otpExpiresAt && new Date(row.otpExpiresAt) > new Date();

  if (!force && stillValid) {
    return row.otpCode;
  }

  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await turso.execute({
    sql: `UPDATE User SET otpCode = ?, otpExpiresAt = ?, otpAttempts = 0 WHERE email = ?`,
    args: [otp, expiresAt, email]
  });

  return otp;
};

/**
 * Verifica el OTP del usuario.
 *
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 *   reason ∈ 'no-user' | 'no-otp' | 'invalid' | 'expired'
 */
export const verifyOTP = async (email, otp) => {
  const result = await turso.execute({
    sql: `SELECT otpCode, otpExpiresAt FROM User WHERE email = ?`,
    args: [email]
  });

  if (!result.rows.length) return { valid: false, reason: 'no-user' };

  const { otpCode, otpExpiresAt } = result.rows[0];

  // No hay ningún código pendiente: el usuario debe pedir uno nuevo.
  if (!otpCode) return { valid: false, reason: 'no-otp' };

  if (otpCode !== otp) return { valid: false, reason: 'invalid' };

  if (!otpExpiresAt || new Date(otpExpiresAt) < new Date()) {
    return { valid: false, reason: 'expired' };
  }

  // Limpiar OTP después de usar
  await turso.execute({
    sql: `UPDATE User SET otpCode = NULL, otpExpiresAt = NULL, otpAttempts = 0 WHERE email = ?`,
    args: [email]
  });

  return { valid: true };
};

/**
 * Registra un intento fallido de OTP (2FA) SIN tocar el bloqueo de la cuenta.
 *
 * Los intentos de OTP viven en su propio contador (`otpAttempts`) porque un
 * código mal escrito no es un ataque de fuerza bruta contra la contraseña:
 * punishir la cuenta por eso dejaba al usuario sin poder entrar nunca.
 *
 * @returns {Promise<number>} el número de intentos de OTP acumulados.
 */
export const registerFailedOtpAttempt = async (userId) => {
  await turso.execute({
    sql: `UPDATE User SET otpAttempts = otpAttempts + 1 WHERE id = ?`,
    args: [userId]
  });

  const result = await turso.execute({
    sql: `SELECT otpAttempts FROM User WHERE id = ?`,
    args: [userId]
  });

  return result.rows[0]?.otpAttempts || 0;
};
