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
 * Genera un OTP de 6 dígitos y lo guarda en la BD con 10 minutos de expiración.
 */
export const generateOTP = async (email) => {
  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await turso.execute({
    sql: `UPDATE User SET otpCode = ?, otpExpiresAt = ? WHERE email = ?`,
    args: [otp, expiresAt, email]
  });

  return otp;
};

/**
 * Verifica el OTP del usuario. Retorna true si es válido, false si expiró o es incorrecto.
 */
export const verifyOTP = async (email, otp) => {
  const result = await turso.execute({
    sql: `SELECT otpCode, otpExpiresAt FROM User WHERE email = ?`,
    args: [email]
  });

  if (!result.rows.length) return false;

  const { otpCode, otpExpiresAt } = result.rows[0];

  if (otpCode !== otp) return false;
  if (!otpExpiresAt || new Date(otpExpiresAt) < new Date()) return false;

  // Limpiar OTP después de usar
  await turso.execute({
    sql: `UPDATE User SET otpCode = NULL, otpExpiresAt = NULL WHERE email = ?`,
    args: [email]
  });

  return true;
};