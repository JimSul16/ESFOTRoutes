import bcrypt from 'bcrypt';
import { turso } from '../config/turso.js';

/**
 * Garantiza que los roles base y el Super Admin existan al arrancar.
 * Usa INSERT OR IGNORE → es idempotente.
 */
export const initializeFirstAdmin = async () => {
  try {
    // Roles base
    await turso.execute(`INSERT OR IGNORE INTO Role (name, description) VALUES ('ADMIN', 'Administrador global')`);
    await turso.execute(`INSERT OR IGNORE INTO Role (name, description) VALUES ('STUDENT', 'Estudiante EPN')`);

    const adminEmail    = process.env.FIRST_ADMIN_EMAIL;
    const adminPassword = process.env.FIRST_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn('⚠️ [Seguridad] FIRST_ADMIN_EMAIL o FIRST_ADMIN_PASSWORD no están configurados en el entorno. Se omite la creación/actualización del Super Admin por defecto.');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Insertar admin si no existe
    await turso.execute({
      sql: `INSERT OR IGNORE INTO User (name, email, password, isVerified, isActive)
            VALUES ('Super Administrador', ?, ?, 1, 1)`,
      args: [adminEmail, hashedPassword]
    });

    // Actualizar contraseña por si cambió en el .env
    await turso.execute({
      sql: `UPDATE User SET password = ?, isVerified = 1, isActive = 1 WHERE email = ?`,
      args: [hashedPassword, adminEmail]
    });

    // Asignar rol ADMIN
    const userResult = await turso.execute({ sql: `SELECT id FROM User WHERE email = ?`, args: [adminEmail] });
    const roleResult = await turso.execute({ sql: `SELECT id FROM Role WHERE name = 'ADMIN'`, args: [] });

    if (userResult.rows.length && roleResult.rows.length) {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO UserRole (userId, roleId) VALUES (?, ?)`,
        args: [userResult.rows[0].id, roleResult.rows[0].id]
      });
    }

    console.log('✅ Roles base y Super Admin garantizados en el sistema.');
  } catch (error) {
    console.error('❌ Error en initializeFirstAdmin:', error.message);
  }
};