import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { turso } from '../config/turso.js';
import { registerUser, clearLockoutState, getAdminEmails } from '../services/auth.service.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendAdminLockoutAlertEmail, getFrontendUrl } from '../services/email.service.js';
import { escapeHtml, isValidEmail } from '../utils/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Dado un userId, devuelve array con los nombres de sus roles.
 */
const getUserRoles = async (userId) => {
  const result = await turso.execute({
    sql: `SELECT r.name FROM Role r
          JOIN UserRole ur ON ur.roleId = r.id
          WHERE ur.userId = ?`,
    args: [userId]
  });
  return result.rows.map(r => r.name);
};

/**
 * Extrae la dirección IP del cliente (soporta proxies y conexiones directas).
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
};

/**
 * Parsea el encabezado User-Agent para identificar navegador y sistema operativo.
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) return 'Dispositivo desconocido';

  let browser = 'Navegador Web';
  if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Google Chrome';
  else if (userAgent.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Apple Safari';
  else if (userAgent.includes('curl/')) browser = 'cURL CLI';
  else if (userAgent.includes('Postman')) browser = 'Postman';

  let os = 'SO Desconocido';
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (userAgent.includes('Windows NT')) os = 'Windows';
  else if (userAgent.includes('Mac OS X')) os = 'macOS';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Linux')) os = 'Linux';

  return `${browser} (${os})`;
};

/**
 * Registra un intento fallido de PASSWORD para un usuario y aplica bloqueo
 * temporal o permanente si corresponde tras superar los límites establecidos.
 */
const handleFailedAttempt = async (user, req, res, reasonMessage) => {
  const currentAttempts = (user.failedAttempts || 0) + 1;
  const lockoutCount = user.lockoutCount || 0;
  const ipAddress = getClientIp(req);
  const rawUserAgent = req.headers['user-agent'] || '';
  const deviceInfo = parseUserAgent(rawUserAgent);

  // Registrar intento fallido en UserSessionLog para auditoría
  try {
    await turso.execute({
      sql: `INSERT INTO UserSessionLog (userId, email, role, ipAddress, deviceInfo, status)
            VALUES (?, ?, 'UNKNOWN', ?, ?, 'FAILED')`,
      args: [user.id, user.email, ipAddress, deviceInfo]
    });
  } catch (_) {}

  // CASO 1: La cuenta ya fue bloqueada temporalmente al menos 3 veces y vuelve
  // a fallar 3 veces consecutivas -> BLOQUEO PERMANENTE.
  // Antes bastaba 1 ciclo de bloqueo temporal (3 intentos) para quedar
  // bloqueado de forma permanente e irreversible.
  if (currentAttempts >= 3 && lockoutCount >= 3) {
    const unlockToken = crypto.randomBytes(32).toString('hex');
    await turso.execute({
      sql: `UPDATE User SET isLocked = 1, unlockToken = ?, failedAttempts = 0 WHERE id = ?`,
      args: [unlockToken, user.id]
    });

    // Avisar a los administradores reales (usuarios con rol ADMIN en la BD).
    // Antes el destinatario venía de `FIRST_ADMIN_EMAIL` en el `.env`, que
    // estaba vacío: el aviso NUNCA salía y la cuenta bloqueada quedaba
    // inservible sin que nadie lo supiera.
    const adminEmails = await getAdminEmails();

    if (adminEmails.length) {
      // Apunta a la pantalla de la SPA, que muestra el resultado en el idioma
      // del usuario. El formulario HTML del GET queda como respaldo.
      const unlockUrl = `${getFrontendUrl()}/desbloquear-cuenta/${unlockToken}`;
      await sendAdminLockoutAlertEmail({ adminEmails, user, ipAddress, deviceInfo, unlockUrl });
    } else {
      console.error(
        `⚠️ No hay administradores a los que avisar del bloqueo de [${user.email}]. ` +
        'Desbloquéalo desde el panel de administración.'
      );
    }

    return res.status(403).json({
      error: adminEmails.length
        ? 'Tu cuenta ha sido bloqueada permanentemente tras múltiples intentos fallidos. Se ha notificado al Administrador para su desbloqueo.'
        : 'Tu cuenta ha sido bloqueada por seguridad tras varios intentos fallidos. Restablece tu contraseña con "Olvidé mi contraseña" para reactivarla, o contacta al Administrador.',
      isLocked: true,
      adminNotified: adminEmails.length > 0
    });
  }

  // CASO 2: Primer ciclo de 3 intentos fallidos -> BLOQUEO TEMPORAL DE 15 MINUTOS
  if (currentAttempts >= 3) {
    const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await turso.execute({
      sql: `UPDATE User SET lockoutUntil = ?, lockoutCount = ?, failedAttempts = 0 WHERE id = ?`,
      args: [lockoutUntil, lockoutCount + 1, user.id]
    });

    return res.status(429).json({
      error: 'Has excedido el límite de 3 intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos.',
      lockoutUntil,
      remainingMinutes: 15
    });
  }

  // CASO 3: Intentos 1 o 2 (Aviso preventivo)
  await turso.execute({
    sql: `UPDATE User SET failedAttempts = ? WHERE id = ?`,
    args: [currentAttempts, user.id]
  });

  const remaining = 3 - currentAttempts;
  return res.status(401).json({
    message: `${reasonMessage}. Te quedan ${remaining} intento(s) antes del bloqueo temporal.`,
    remainingAttempts: remaining
  });
};

// ─── Controladores ────────────────────────────────────────────────────────────

/**
 * Valida los campos académicos opcionales del registro (RR-003).
 *
 * `career` y `semester` son opcionales por ahora para no romper el formulario
 * actual del frontend; cuando vienen, se validan. `uniqueId` (RR-005) sigue
 * el mismo criterio: 9 dígitos si se envía.
 *
 * @returns {string|null} Mensaje de error, o `null` si todo está bien.
 */
export const validateAcademicFields = ({ career, semester, uniqueId } = {}) => {
  if (career !== undefined && career !== null && career !== '') {
    if (typeof career !== 'string' || career.trim().length < 3) {
      return 'La carrera debe tener al menos 3 caracteres.';
    }
  }

  if (semester !== undefined && semester !== null && semester !== '') {
    const n = Number(semester);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return 'El semestre debe ser un número entero entre 1 y 10.';
    }
  }

  if (uniqueId !== undefined && uniqueId !== null && uniqueId !== '') {
    if (typeof uniqueId !== 'string' && typeof uniqueId !== 'number') {
      return 'El identificador único debe ser un valor de 9 dígitos.';
    }
    const digits = String(uniqueId).trim();
    if (!/^\d{9}$/.test(digits)) {
      return 'El identificador único debe tener exactamente 9 dígitos.';
    }
  }

  return null;
};

export const register = async (req, res) => {
  try {
    const { name, email, password, career, semester, uniqueId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // RR-003 / RR-005: carrera, semestre e identificador institucional.
    const academicError = validateAcademicFields({ career, semester, uniqueId });
    if (academicError) {
      return res.status(400).json({ error: academicError });
    }

    // Un `uniqueId` ya asignado debe rechazarse con 409 antes de intentar el
    // INSERT (el UNIQUE de la columna daría un 500 genérico).
    if (uniqueId !== undefined && uniqueId !== null && uniqueId !== '') {
      const existing = await turso.execute({
        sql: `SELECT id FROM User WHERE uniqueId = ?`,
        args: [String(uniqueId).trim()]
      });
      if (existing.rows.length) {
        return res.status(409).json({ error: 'Este identificador único ya está registrado.' });
      }
    }

    // Un `email` que no sea string reventaba con un TypeError (500), y el
    // dominio se comparaba sin normalizar: `User@EPN.EDU.EC` se rechazaba.
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isAllowedDomain =
      normalizedEmail.endsWith('@epn.edu.ec') || normalizedEmail.endsWith('@gmail.com');
    if (!isAllowedDomain) {
      return res.status(400).json({ error: 'Solo se permiten correos institucionales (@epn.edu.ec) o @gmail.com.' });
    }

    // Un `password` numérico pasaba la validación (`.length` es `undefined`,
    // y `undefined < 8` es `false`) y reventaba después en `bcrypt.hash`.
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const user = await registerUser({
      name,
      email: normalizedEmail,
      password,
      career: career !== undefined && career !== null && career !== '' ? String(career).trim() : null,
      semester: semester !== undefined && semester !== null && semester !== '' ? Number(semester) : null,
      uniqueId: uniqueId !== undefined && uniqueId !== null && uniqueId !== '' ? String(uniqueId).trim() : null,
    });

    const delivery = await sendVerificationEmail(user.email, user.verificationToken);
    if (delivery && !delivery.ok) {
      console.warn('⚠️ Error al enviar email de verificación:', delivery.error);
      return res.status(201).json({
        message: 'Usuario creado exitosamente en la BD, pero hubo un error al enviar el correo.',
        emailError: true
      });
    }

    return res.status(201).json({
      message: 'Usuario creado. Revisa tu bandeja de entrada para verificar tu cuenta.'
    });
  } catch (error) {
    console.error('Error en register:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      // El UNIQUE puede ser el email o el uniqueId (RR-005): responder 409
      // para identificadores duplicados y 400 (mensaje actual) para emails.
      if (error.message.includes('uniqueId')) {
        return res.status(409).json({ error: 'Este identificador único ya está registrado.' });
      }
      return res.status(400).json({ error: 'Este correo ya se encuentra registrado.' });
    }
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await turso.execute({
      sql: `SELECT id FROM User WHERE verificationToken = ?`,
      args: [token]
    });

    const isHtmlRequest = Boolean(req.headers.accept?.includes('text/html'));

    if (!result.rows.length) {
      if (isHtmlRequest) {
        return res.redirect(`${getFrontendUrl()}/login?error=invalid_token`);
      }
      return res.status(400).json({ message: 'Token inválido' });
    }

    await turso.execute({
      sql: `UPDATE User SET isVerified = 1, verificationToken = NULL WHERE id = ?`,
      args: [result.rows[0].id]
    });

    if (isHtmlRequest) {
      return res.redirect(`${getFrontendUrl()}/login?verified=true`);
    }

    res.json({ message: 'Cuenta verificada con éxito' });
  } catch (error) {
    console.error('Error en verifyAccount:', error);
    res.status(500).json({ error: 'Error al verificar la cuenta.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    const result = await turso.execute({
      sql: `SELECT * FROM User WHERE LOWER(email) = ?`,
      args: [normalizedEmail]
    });

    if (!result.rows.length) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];

    // ── Comprobación 0: Cuenta desactivada ───────────────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Tu cuenta está desactivada. Contacta al Administrador para reactivarla.',
        isActive: false
      });
    }

    // ── Comprobación 1: Bloqueo Crítico Permanente ───────────────────────────
    if (user.isLocked) {
      return res.status(403).json({
        error: 'Tu cuenta fue bloqueada por seguridad tras varios intentos fallidos. Restablece tu contraseña con "Olvidé mi contraseña" para reactivarla, o contacta al Administrador.',
        isLocked: true
      });
    }

    // ── Comprobación 2: Bloqueo Temporal (15 minutos) ─────────────────────────
    if (user.lockoutUntil) {
      const lockTime = new Date(user.lockoutUntil);
      const now = new Date();
      if (lockTime > now) {
        const remainingMinutes = Math.ceil((lockTime - now) / 60000);
        return res.status(429).json({
          error: `Cuenta bloqueada temporalmente por intentos fallidos. Podrás intentar nuevamente en ${remainingMinutes} minuto(s).`,
          remainingMinutes,
          lockoutUntil: user.lockoutUntil
        });
      } else {
        // El tiempo de 15 min expiró: limpiar el bloqueo temporal
        await turso.execute({
          sql: `UPDATE User SET lockoutUntil = NULL WHERE id = ?`,
          args: [user.id]
        });
      }
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Debes verificar tu cuenta institucional primero' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return await handleFailedAttempt(user, req, res, 'Credenciales incorrectas');
    }

    // ── Login Exitoso: Resetear contadores de fallos y bloqueos ───────────────
    await turso.execute({
      sql: `UPDATE User SET failedAttempts = 0, lockoutUntil = NULL, lockoutCount = 0 WHERE id = ?`,
      args: [user.id]
    });

    const userRoles = await getUserRoles(user.id);

    // ── Registro de Auditoría de Sesión en Turso ──────────────────────────────
    const ipAddress = getClientIp(req);
    const rawUserAgent = req.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(rawUserAgent);
    const primaryRole = userRoles[0] || 'ESTUDIANTE';

    try {
      await turso.execute({
        sql: `INSERT INTO UserSessionLog (userId, email, role, ipAddress, deviceInfo, status)
              VALUES (?, ?, ?, ?, ?, 'SUCCESS')`,
        args: [user.id, user.email, primaryRole, ipAddress, deviceInfo]
      });
      console.log(`📝 Sesión auditada: [${user.email}] | Rol: ${primaryRole} | IP: ${ipAddress} | Dispositivo: ${deviceInfo}`);
    } catch (auditErr) {
      console.error('⚠️ Error al registrar auditoría de sesión:', auditErr.message);
    }

    const token = jwt.sign(
      { id: user.id, roles: userRoles },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: '¡Inicio de sesión exitoso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, roles: userRoles }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await turso.execute({
      sql: `SELECT id, name FROM User WHERE LOWER(email) = ?`,
      args: [normalizedEmail]
    });

    if (!result.rows.length) {
      // Mensaje neutro para prevenir enumeración de cuentas
      return res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
    }

    const user       = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');

    await turso.execute({
      sql: `UPDATE User SET resetToken = ? WHERE id = ?`,
      args: [resetToken, user.id]
    });

    const delivery = await sendPasswordResetEmail(normalizedEmail, user.name, resetToken);

    if (delivery && !delivery.ok) {
      console.warn(`⚠️ No se pudo entregar el correo de restablecimiento a [${normalizedEmail}]:`, delivery.error);
    }

    res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token }       = req.params;
    const { newPassword } = req.body;

    if (typeof newPassword !== 'string' || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const result = await turso.execute({
      sql: `SELECT id FROM User WHERE resetToken = ?`,
      args: [token]
    });

    if (!result.rows.length) {
      return res.status(400).json({ message: 'El token es inválido o ha expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await turso.execute({
      sql: `UPDATE User SET password = ?, resetToken = NULL, updatedAt = datetime('now') WHERE id = ?`,
      args: [hashedPassword, result.rows[0].id]
    });

    // ⚠️ CRÍTICO: quien demuestra ser dueño de la cuenta (tiene el token del
    // correo) recupera el acceso. Antes el reset solo cambiaba el hash: si la
    // cuenta estaba bloqueada (isLocked / lockoutUntil) el login se cortaba
    // ANTES de comparar la contraseña y el usuario se quedaba fuera para
    // siempre, aunque acabara de escribir la contraseña correcta.
    await clearLockoutState(result.rows[0].id);

    console.log(`🔓 Estado de bloqueo reiniciado tras el reset de contraseña (userId=${result.rows[0].id}).`);

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: error.message });
  }
};


export const getProfile = async (req, res) => {
  try {
    const result = await turso.execute({
      sql: `SELECT id, name, email, createdAt, streak, level, xp, initials,
                   learningProfile, profilePicture, career, semester, uniqueId
            FROM User WHERE id = ?`,
      args: [req.user.id]
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user  = result.rows[0];
    const roles = await getUserRoles(user.id);

    res.json({ ...user, roles });
  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
};

/**
 * Resumen de avances del estudiante (RR-004).
 * GET /api/auth/my-progress
 *
 * Devuelve el progreso global (puntos/nivel) junto al detalle de rutas
 * inscritas y módulos aprobados, para que el frontend pinte el resumen de
 * avances sin llamadas extra. Los campos con "XP" mantienen su nombre
 * histórico y se añaden alias `points*` para el renombre a "progreso".
 */
export const getMyProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await turso.execute({
      sql: `SELECT xp, level, streak, career, semester FROM User WHERE id = ?`,
      args: [userId]
    });

    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = userResult.rows[0];

    const modulesResult = await turso.execute({
      sql: `SELECT COUNT(*) AS total,
                   SUM(CASE WHEN isPassed = 1 THEN 1 ELSE 0 END) AS passed
            FROM ModuleProgress WHERE userId = ?`,
      args: [userId]
    });
    const modules = modulesResult.rows[0] || {};

    const routesResult = await turso.execute({
      sql: `SELECT lr.id, lr.title, lr.category, lr.imageUrl, lr.estimatedTime,
                   e.progress, e.createdAt AS enrolledAt
            FROM Enrollment e
            JOIN LearningRoute lr ON lr.id = e.learningRouteId
            WHERE e.userId = ?
            ORDER BY e.createdAt DESC`,
      args: [userId]
    });

    const routes = routesResult.rows;
    const totalProgress = routes.length
      ? Math.round(routes.reduce((sum, r) => sum + (r.progress || 0), 0) / routes.length)
      : 0;

    // Últimas actividades (RR-004): módulos aprobados recientes + accesos.
    const activitiesResult = await turso.execute({
      sql: `SELECT 'MODULE' AS kind,
                   ('Módulo aprobado: ' || IFNULL(m.title, 'Módulo')) AS label,
                   mp.score AS score,
                   mp.completedAt AS at
            FROM ModuleProgress mp
            JOIN Module m ON m.id = mp.moduleId
            WHERE mp.userId = ? AND mp.isPassed = 1
            UNION ALL
            SELECT 'SESSION' AS kind,
                   ('Inicio de sesión (' || IFNULL(ul.status, 'SUCCESS') || ')') AS label,
                   NULL AS score,
                   ul.createdAt AS at
            FROM UserSessionLog ul
            WHERE ul.userId = ? AND ul.status = 'SUCCESS'
            ORDER BY at DESC
            LIMIT 10`,
      args: [userId, userId]
    });

    res.json({
      // Alias en español para el renombre XP → "progreso" (RR-004).
      points: user.xp,
      level: user.level,
      streak: user.streak,
      xp: user.xp,              // nombre histórico (compatibilidad)
      progressLevel: user.level,
      career: user.career,
      semester: user.semester,
      modulesCompleted: Number(modules.total || 0),
      modulesPassed: Number(modules.passed || 0),
      routesEnrolled: routes.length,
      averageProgress: totalProgress,
      routes,
      recentActivities: activitiesResult.rows
    });
  } catch (error) {
    console.error('Error en getMyProgress:', error);
    res.status(500).json({ error: 'Error al obtener el resumen de progreso.' });
  }
};

export const getSessionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await turso.execute({
      sql: `SELECT id, email, role, ipAddress, deviceInfo, status, createdAt
            FROM UserSessionLog
            WHERE userId = ?
            ORDER BY id DESC
            LIMIT 10`,
      args: [userId]
    });

    res.json(result.rows);
  } catch (error) {
    console.error('Error en getSessionHistory:', error);
    res.status(500).json({ error: 'Error al consultar historial de sesiones.' });
  }
};

// ─── Perfil y Cambio de Contraseña ─────────────────────────────────────────────

/**
 * Deriva las iniciales (máx. 2 letras) a partir de un nombre completo.
 * "Ana María Delgado" → "AD"
 */
const computeInitials = (name) => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

/**
 * Actualiza los datos editables del perfil del usuario autenticado.
 * PUT /api/auth/profile
 * Body: { name?, profilePicture?, learningProfile?, career?, semester? }
 *
 * Por diseño NO se permite modificar email, roles, xp, level ni streak:
 * son campos gestionados por el servidor (verificación, gamificación, roles).
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, profilePicture, learningProfile, career, semester } = req.body;

    // ── Validaciones ───────────────────────────────────────────────────────────
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 3)) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres.' });
    }

    // RR-003: carrera y semestre también se editan desde el perfil.
    const academicError = validateAcademicFields({ career, semester });
    if (academicError) {
      return res.status(400).json({ error: academicError });
    }

    const updates = [];
    const args    = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name.trim());
      // Mantener las iniciales sincronizadas con el nombre.
      updates.push('initials = ?');
      args.push(computeInitials(name.trim()));
    }

    if (career !== undefined) {
      updates.push('career = ?');
      args.push(career === null || career === '' ? null : String(career).trim());
    }

    if (semester !== undefined) {
      updates.push('semester = ?');
      args.push(semester === null || semester === '' ? null : Number(semester));
    }

    if (profilePicture !== undefined) {
      if (profilePicture !== null && typeof profilePicture !== 'string') {
        return res.status(400).json({ error: 'La foto de perfil debe ser una URL.' });
      }
      updates.push('profilePicture = ?');
      args.push(profilePicture);
    }

    if (learningProfile !== undefined) {
      updates.push('learningProfile = ?');
      args.push(
        typeof learningProfile === 'string' ? learningProfile : JSON.stringify(learningProfile)
      );
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se envió ningún campo editable.' });
    }

    // ── Persistencia ───────────────────────────────────────────────────────────
    updates.push("updatedAt = datetime('now')");
    args.push(userId);

    await turso.execute({
      sql: `UPDATE User SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    const result = await turso.execute({
      sql: `SELECT id, name, email, createdAt, streak, level, xp, initials,
                   learningProfile, profilePicture, career, semester, uniqueId
            FROM User WHERE id = ?`,
      args: [userId]
    });

    const user  = result.rows[0];
    const roles = await getUserRoles(user.id);

    res.json({ message: 'Perfil actualizado correctamente.', user: { ...user, roles } });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil.' });
  }
};

/**
 * Cambia la contraseña del usuario autenticado verificando la actual.
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 *
 * Es la vía autenticada de RR-002; la vía por email (forgot/reset) queda aparte.
 */
export const changePassword = async (req, res) => {
  try {
    const userId          = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'La contraseña actual y la nueva son obligatorias.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const result = await turso.execute({
      sql: `SELECT password FROM User WHERE id = ?`,
      args: [userId]
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await turso.execute({
      sql: `UPDATE User SET password = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [hashedPassword, userId]
    });

    // El cambio de contraseña es una vía autenticada ⇒ también reinicia el
    // estado de bloqueo, para no dejar contadores a medias que bloqueen el
    // siguiente inicio de sesión.
    await clearLockoutState(userId);

    res.json({ message: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Desbloquea una cuenta a través del token firmado enviado al correo del Administrador.
 */
export const renderUnlockAccountForm = (req, res) => {
  const { token } = req.params;
  // El token viene de la URL, o sea lo controla el cliente: sin escapar se
  // convertía en HTML ejecutable (XSS reflejado). Además se recorta a un
  // tamaño razonable para no reflejar un payload enorme en la página.
  const safeToken = escapeHtml(String(token ?? '').slice(0, 128));
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <title>Desbloquear Cuenta</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #1e293b;">
      <div style="max-width: 480px; margin: auto; background: white; padding: 35px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <h2>Confirmar Desbloqueo</h2>
        <p>¿Estás seguro de que deseas reactivar esta cuenta?</p>
        <form method="POST" action="/api/auth/unlock-account/${safeToken}">
          <button type="submit" style="background-color: #2563eb; color: white; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; border: none;">
            Desbloquear Cuenta
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
};

export const unlockAccountViaToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).send('<h1>Token de desbloqueo no proporcionado.</h1>');
    }

    const result = await turso.execute({
      sql: `SELECT id, name, email FROM User WHERE unlockToken = ?`,
      args: [token]
    });

    if (!result.rows.length) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <title>Enlace Inválido</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #1e293b;">
          <div style="max-width: 480px; margin: auto; background: white; padding: 35px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            <div style="color: #ef4444; font-size: 40px; margin-bottom: 10px;">✕</div>
            <h2 style="color: #ef4444; margin-bottom: 8px;">Enlace Inválido o Ya Utilizado</h2>
            <p style="color: #64748b; font-size: 14px;">Este enlace de desbloqueo no es válido o la cuenta ya fue reactivada anteriormente.</p>
          </div>
        </body>
        </html>
      `);
    }

    const user = result.rows[0];

    // Desbloquear usuario en Turso
    await clearLockoutState(user.id);

    console.log(`🔓 Cuenta [${user.email}] desbloqueada con éxito por el Administrador.`);

    // `escapeHtml` vive en `src/utils/index.js` (se usa también para el
    // token de la URL en `renderUnlockAccountForm`).
    const safeUserName = escapeHtml(user.name);
    const safeUserEmail = escapeHtml(user.email);

    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <title>Cuenta Desbloqueada</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #1e293b;">
        <div style="max-width: 480px; margin: auto; background: white; padding: 35px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <div style="color: #16a34a; font-size: 48px; margin-bottom: 10px;">✓</div>
          <h2 style="color: #0f172a; margin-bottom: 8px;">¡Cuenta Desbloqueada con Éxito!</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">El usuario <strong>${safeUserName}</strong> (<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${safeUserEmail}</code>) ha sido reactivado y ahora puede iniciar sesión con normalidad.</p>
          <div style="margin-top: 25px;">
            <a href="${getFrontendUrl()}" style="background-color: #2563eb; color: white; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
              Ir al Portal
            </a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error al desbloquear usuario:', error);
    return res.status(500).send('<h1>Error al procesar el desbloqueo.</h1>');
  }
};
