/**
 * Regresión del bloqueo de cuentas por contraseñas.
 *
 * Contexto: El login es directo (sin OTP).
 * Estos tests verifican:
 *   1. Inicio de sesión exitoso devuelve 200 y token.
 *   2. Contraseñas incorrectas incrementan failedAttempts y bloquean a los 3 intentos.
 *   3. Bloqueo temporal dura 15 minutos (retorna 429).
 *   4. Bloqueo permanente tras 3 ciclos de bloqueo temporal (retorna 403).
 *   5. Un reset de contraseña (con token del correo) desbloquea la cuenta.
 *   6. La cuenta desactivada no puede iniciar sesión.
 */
process.env.TURSO_DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'secret-de-pruebas';

// En modo ESM el objeto `jest` no es global: hay que importarlo.
import { jest } from '@jest/globals';

// El servicio de correo se simula: en las pruebas no hay SMTP real.
const emailMock = {
  sendVerificationEmail: jest.fn(async () => ({ ok: true })),
  sendPasswordResetEmail: jest.fn(async () => ({ ok: true })),
  sendAdminLockoutAlertEmail: jest.fn(async () => ({ ok: true })),
  getFrontendUrl: jest.fn(() => 'http://localhost:5173'),
};

jest.unstable_mockModule('../src/services/email.service.js', () => emailMock);

const { turso } = await import('../src/config/turso.js');
const { runMigrations } = await import('../src/db/migrate.js');
const { login, resetPassword, forgotPassword } = await import(
  '../src/controllers/auth.controller.js'
);
const { registerUser, clearLockoutState, getAdminEmails } = await import(
  '../src/services/auth.service.js'
);
const { ensureBaseRoles } = await import('../src/services/init.service.js');

const mockRes = () => {
  const res = { payload: null, statusCode: 200 };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  res.send = (j) => { res.payload = j; return res; };
  return res;
};

const mockReq = (body = {}) => ({
  body,
  headers: {},
  socket: { remoteAddress: '127.0.0.1' },
  ip: '127.0.0.1',
});

let counter = 0;
const crearUsuario = async (password = 'PasswordSegura123!') => {
  const email = `regresion.${Date.now()}.${counter++}@gmail.com`;
  await registerUser({ name: 'Usuario Regresión', email, password });
  await turso.execute('UPDATE User SET isVerified = 1 WHERE email = ?', [email]);
  return { email, password };
};

const estado = async (email) =>
  (await turso.execute(
    `SELECT isLocked, failedAttempts, lockoutCount, lockoutUntil
       FROM User WHERE email = ?`,
    [email]
  )).rows[0];

const loguear = async (email, password) => {
  const res = mockRes();
  await login(mockReq({ email, password }), res);
  return res;
};

/** Vence el bloqueo temporal para simular el paso de los 15 minutos. */
const vencerBloqueoTemporal = async (email) => {
  await turso.execute(
    'UPDATE User SET lockoutUntil = ? WHERE email = ?',
    [new Date(Date.now() - 1000).toISOString(), email]
  );
};

beforeAll(async () => {
  await runMigrations();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Login — Autenticación directa (sin OTP)', () => {
  it('inicia sesión directamente con credenciales válidas y retorna 200 + token', async () => {
    const { email, password } = await crearUsuario();

    const res = await loguear(email, password);
    expect(res.statusCode).toBe(200);
    expect(res.payload.token).toBeDefined();
    expect(res.payload.user).toBeDefined();
    expect(res.payload.user.email).toBe(email);

    const st = await estado(email);
    expect(st.failedAttempts).toBe(0);
    expect(st.isLocked).toBe(0);
  });

  it('rechaza contraseñas incorrectas con 401 e incrementa failedAttempts', async () => {
    const { email } = await crearUsuario();

    const res = await loguear(email, 'ContrasenaIncorrecta!');
    expect(res.statusCode).toBe(401);

    const st = await estado(email);
    expect(st.failedAttempts).toBe(1);
  });
});

describe('Reset de contraseña — reactiva una cuenta bloqueada', () => {
  it('limpia el bloqueo temporal y permite entrar con la nueva contraseña', async () => {
    const { email } = await crearUsuario();

    // 3 contraseñas incorrectas => bloqueo temporal de 15 minutos.
    for (let i = 0; i < 3; i++) await loguear(email, 'ClaveEquivocada123!');
    expect((await estado(email)).lockoutUntil).not.toBeNull();

    const resForgot = mockRes();
    await forgotPassword(mockReq({ email }), resForgot);
    expect(resForgot.statusCode).toBe(200);

    const token = (await turso.execute(
      'SELECT resetToken FROM User WHERE email = ?', [email]
    )).rows[0].resetToken;

    const resReset = mockRes();
    await resetPassword({ params: { token }, body: { newPassword: 'NuevaClave456!' } }, resReset);
    expect(resReset.statusCode).toBe(200);

    const st = await estado(email);
    expect(st.isLocked).toBe(0);
    expect(st.lockoutUntil).toBeNull();
    expect(st.lockoutCount).toBe(0);
    expect(st.failedAttempts).toBe(0);

    // Y la contraseña nueva es la que vale, retornando 200 con token directo.
    const ok = await loguear(email, 'NuevaClave456!');
    expect(ok.statusCode).toBe(200);
    expect(ok.payload.token).toBeDefined();
  });

  it('reactiva también una cuenta con bloqueo permanente', async () => {
    const { email, password } = await crearUsuario();

    // Simula el estado de bloqueo permanente.
    await turso.execute(
      'UPDATE User SET isLocked = 1, lockoutCount = 3 WHERE email = ?', [email]
    );

    const conPassword = await loguear(email, password);
    expect(conPassword.statusCode).toBe(403);

    const resForgot = mockRes();
    await forgotPassword(mockReq({ email }), resForgot);
    const token = (await turso.execute(
      'SELECT resetToken FROM User WHERE email = ?', [email]
    )).rows[0].resetToken;

    const resReset = mockRes();
    await resetPassword({ params: { token }, body: { newPassword: 'Rescate999!' } }, resReset);
    expect(resReset.statusCode).toBe(200);

    const st = await estado(email);
    expect(st.isLocked).toBe(0);

    const ok = await loguear(email, 'Rescate999!');
    expect(ok.statusCode).toBe(200);
    expect(ok.payload.token).toBeDefined();
  });
});

describe('Login — cuenta desactivada', () => {
  it('rechaza el acceso con 403 aunque la contraseña sea correcta', async () => {
    const { email, password } = await crearUsuario();
    await turso.execute('UPDATE User SET isActive = 0 WHERE email = ?', [email]);

    const res = await loguear(email, password);
    expect(res.statusCode).toBe(403);
    expect(res.payload.isActive).toBe(false);
  });
});

describe('Bloqueo por contraseñas incorrectas (política intacta)', () => {
  it('bloquea temporalmente tras 3 intentos', async () => {
    const { email } = await crearUsuario();

    for (let i = 0; i < 2; i++) {
      const res = await loguear(email, 'ClaveEquivocada123!');
      expect(res.statusCode).toBe(401);
    }

    const res = await loguear(email, 'ClaveEquivocada123!');
    expect(res.statusCode).toBe(429);
    expect((await estado(email)).lockoutCount).toBe(1);
  });

  it('exige varios ciclos antes del bloqueo permanente', async () => {
    const { email } = await crearUsuario();

    // Un solo ciclo de bloqueo temporal NO debe bastar para el permanente.
    for (let i = 0; i < 3; i++) await loguear(email, 'ClaveEquivocada123!');
    expect((await estado(email)).isLocked).toBe(0);

    // Tampoco el segundo.
    await vencerBloqueoTemporal(email);
    for (let i = 0; i < 3; i++) await loguear(email, 'ClaveEquivocada123!');
    expect((await estado(email)).isLocked).toBe(0);
  });
});

describe('clearLockoutState', () => {
  it('deja la cuenta sin ningún rastro de bloqueo', async () => {
    const { email } = await crearUsuario();
    await turso.execute(
      `UPDATE User SET isLocked = 1, lockoutUntil = '2099-01-01T00:00:00.000Z',
              lockoutCount = 3, failedAttempts = 2 WHERE email = ?`,
      [email]
    );

    const id = (await turso.execute('SELECT id FROM User WHERE email = ?', [email])).rows[0].id;
    await clearLockoutState(id);

    const st = await estado(email);
    expect(st.isLocked).toBe(0);
    expect(st.lockoutUntil).toBeNull();
    expect(st.lockoutCount).toBe(0);
    expect(st.failedAttempts).toBe(0);
  });
});

describe('Administradores — derivados de la BD, no del .env', () => {
  it('getAdminEmails devuelve a los usuarios con rol ADMIN y excluye los de prueba', async () => {
    // ADMIN de verdad
    const { email: adminEmail } = await crearUsuario();
    await turso.execute(
      `INSERT OR IGNORE INTO Role (name, description) VALUES ('ADMIN', 'Administrador global')`
    );
    const role = (await turso.execute(`SELECT id FROM Role WHERE name = 'ADMIN'`)).rows[0];
    await turso.execute(
      'INSERT OR IGNORE INTO UserRole (userId, roleId) VALUES ((SELECT id FROM User WHERE email = ?), ?)',
      [adminEmail, role.id]
    );

    // Cuenta desechable de la suite de Postman (prefijo `test.`)
    const { email: testEmail } = await crearUsuario();
    await turso.execute('UPDATE User SET email = ? WHERE email = ?', [
      `test.admin.${Date.now()}@gmail.com`,
      testEmail,
    ]);
    await turso.execute(
      'INSERT OR IGNORE INTO UserRole (userId, roleId) VALUES ((SELECT id FROM User WHERE email = ?), ?)',
      [testEmail, role.id]
    );

    const admins = await getAdminEmails();
    expect(admins).toContain(adminEmail);
    expect(admins).not.toContain(testEmail);
  });

  it('ensureBaseRoles promueve al usuario más antiguo si nadie tiene rol ADMIN', async () => {
    // Se parte de una base sin administradores.
    await turso.execute('DELETE FROM UserRole WHERE roleId IN (SELECT id FROM Role WHERE name = ?)', ['ADMIN']);

    await crearUsuario();

    // El más antiguo de la base (menor id), que es a quien debe promoverse.
    const oldest = (await turso.execute('SELECT id, email FROM User ORDER BY id LIMIT 1')).rows[0];

    await ensureBaseRoles();

    const admins = (await turso.execute(
      `SELECT u.email FROM User u
         JOIN UserRole ur ON ur.userId = u.id
         JOIN Role r ON r.id = ur.roleId
        WHERE r.name = 'ADMIN'`
    )).rows.map((r) => r.email);

    expect(admins).toContain(oldest.email);

    // Idempotente: la segunda llamada no duplica la asignación.
    await ensureBaseRoles();
    const asignaciones = (await turso.execute(
      `SELECT COUNT(*) AS n FROM UserRole WHERE userId = ? AND roleId = (SELECT id FROM Role WHERE name = 'ADMIN')`,
      [oldest.id]
    )).rows[0].n;
    expect(Number(asignaciones)).toBe(1);
  });
});
