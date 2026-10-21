import { turso } from '../config/turso.js';

/**
 * Garantiza que existan los roles base y que el proyecto tenga al menos un
 * administrador. Es idempotente: se puede llamar en cada arranque.
 *
 * Antes esta función leía `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` del
 * `.env` para "sembrar" un Super Administrador. Eso no funcionaba (las
 * variables estaban vacías) y era peligroso: cuando sí estaban definidas,
 * el arranque del backend **sobrescribía la contraseña del administrador en
 * cada reinicio**, así que cualquier cambio de clave hecho desde la aplicación
 * se perdía al reiniciar el servidor.
 *
 * Ahora:
 *   1. Los roles base (ADMIN, STUDENT) se crean siempre.
 *   2. Si el proyecto no tiene NINGÚN usuario con rol ADMIN, se promueve al
 *      más antiguo, de modo que siempre exista alguien que pueda administrar
 *      los roles y desbloquear cuentas.
 */
export const ensureBaseRoles = async () => {
  try {
    // ── Roles base ──────────────────────────────────────────────────────────
    await turso.execute(`INSERT OR IGNORE INTO Role (name, description) VALUES ('ADMIN', 'Administrador global')`);
    await turso.execute(`INSERT OR IGNORE INTO Role (name, description) VALUES ('STUDENT', 'Estudiante EPN')`);

    // ── Al menos un administrador ───────────────────────────────────────────
    const admins = await turso.execute({
      sql: `SELECT u.id, u.email
              FROM User u
              JOIN UserRole ur ON ur.userId = u.id
              JOIN Role r ON r.id = ur.roleId
             WHERE r.name = 'ADMIN'`,
      args: []
    });

    if (admins.rows.length === 0) {
      // Nadie con rol ADMIN: promovemos al usuario más antiguo para que el
      // sistema no se quede sin nadie que pueda administrarlo.
      const oldest = await turso.execute({
        sql: `SELECT id, email FROM User ORDER BY id LIMIT 1`,
        args: []
      });

      if (oldest.rows.length) {
        const adminRole = await turso.execute({
          sql: `SELECT id FROM Role WHERE name = 'ADMIN'`,
          args: []
        });

        await turso.execute({
          sql: `INSERT OR IGNORE INTO UserRole (userId, roleId) VALUES (?, ?)`,
          args: [oldest.rows[0].id, adminRole.rows[0].id]
        });

        console.log(`👑 Usuario más antiguo [${oldest.rows[0].email}] promovido a ADMIN (no había ningún administrador).`);
      } else {
        console.warn('⚠️ [Seguridad] No hay usuarios en la base: todavía no se puede asignar un administrador.');
      }
    } else {
      console.log(`👑 Administradores activos: ${admins.rows.map((a) => a.email).join(', ')}`);
    }

    console.log('✅ Roles base garantizados en el sistema.');
  } catch (error) {
    console.error('❌ Error en ensureBaseRoles:', error.message);
  }
};

/**
 * Avisa de bloqueos permanentes que NADIE puede resolver.
 *
 * El bloqueo permanente (isLocked = 1) se levanta desde el panel del
 * Administrador o con el enlace que se manda por correo. Si no hay ningún
 * administrador al que avisar, o si hay cuentas bloqueadas sin resolver, el
 * arranque lo dice en consola: antes el `.env` vacío lo ocultaba.
 */
export const warnAboutLockedAccounts = async () => {
  try {
    const result = await turso.execute(
      `SELECT id, email FROM User WHERE isLocked = 1 OR lockoutUntil IS NOT NULL`
    );

    if (result.rows.length) {
      console.warn(
        `⚠️ [Seguridad] Hay ${result.rows.length} cuenta(s) con bloqueo vigente: ${result.rows
          .map((r) => r.email)
          .join(', ')}`
      );
      console.warn(
        '   Se desbloquean desde el panel de administración (POST /api/admin/users/:id/unlock) o con "Olvidé mi contraseña".'
      );
    }
  } catch (error) {
    console.error('⚠️ Error revisando cuentas bloqueadas:', error.message);
  }
};
