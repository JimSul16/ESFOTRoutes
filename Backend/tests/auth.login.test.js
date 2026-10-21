/**
 * Regresión del bloqueo de cuentas por contraseñas/OTP.
 *
 * Contexto: el login exigía un OTP por correo en CADA intento. Un código mal
 * escrito consumía el MISMO contador que una contraseña incorrecta, así que
 * bastaban 3 equivocaciones con el OTP para bloquear la cuenta 15 minutos y,
 * tras un segundo ciclo, para BLOQUEARLA PERMANENTEMENTE. Como la contraseña
 * se comparaba DESPUÉS del corte de bloqueo, ni la contraseña correcta ni un
 * reset de contraseña permitían volver a entrar: la cuenta quedaba muerta.
 *
 * Estos tests fijan el comportamiento correcto:
 *   1. Un OTP mal escrito NO bloquea la cuenta.
 *   2. El código OTP no se invalida si se pide dos veces.
 *   3. Un reset de contraseña (con token del correo) desbloquea la cuenta.
 *   4. La cuenta desactivada no puede iniciar sesión.
 */
process.env.TURSO_DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'secret-de-pruebas';

// En modo ESM el objeto `jest` no es global: hay que importarlo.
import { jest } from '@jest/globals';

// El servicio de correo se simula: en las pruebas no hay SMTP real y así se
// puede forzar tanto el envío correcto como el fallo de entrega.
const emailMock = {
  sendVerificationEmail: jest.fn(async () => ({ ok: true })),
  sendPasswordResetEmail: jest.fn(async () => ({ ok: true })),
  sendOTPEmail: jest.fn(async () => ({ ok: true })),
  sendAdminLockoutAlertEmail: jest.fn(async () => ({ ok: true })),
};

jest.unstable_mockModule('../src/services/email.service.js', () => emailMock);

const { turso } = await import('../src/config/turso.js');
const { runMigrations } = await import('../src/db/migrate.js');
const { login, resetPassword, forgotPassword } = await import(
  '../src/controllers/auth.controller.js'
);
const { registerUser, generateOTP, clearLockoutState, getAdminEmails } = await import(
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
    `SELECT isLocked, failedAttempts, lockoutCount, lockoutUntil, otpAttempts
       FROM User WHERE email = ?`,
    [email]
  )).rows[0];

const loguear = async (email, password, otp) => {
  const res = mockRes();
  await login(mockReq(otp ? { email, password, otp } : { email, password }), res);
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
  emailMock.sendOTPEmail.mockClear();
  emailMock.sendOTPEmail.mockResolvedValue({ ok: true });
});

describe('Login — el OTP mal escrito no bloquea la cuenta', () => {
  it('acepta 5 códigos incorrectos y mantiene la cuenta usable', async () => {
    const { email, password } = await crearUsuario();

    // Paso 1: contraseña correcta => el backend pide el OTP.
    const paso1 = await loguear(email, password);
    expect(paso1.statusCode).toBe(206);

    for (let i = 0; i < 5; i++) {
      const res = await loguear(email, password, '000000');
      expect(res.statusCode).toBe(401);
    }

    const st = await estado(email);
    expect(st.isLocked).toBe(0);
    expect(st.failedAttempts).toBe(0);
    expect(st.lockoutUntil).toBeNull();

    // La cuenta sigue sirviendo: se puede pedir un código y entrar.
    const nuevo = await loguear(email, password);
    expect(nuevo.statusCode).toBe(206);
  });

  it('invalida el código tras agotar los intentos, sin bloquear la cuenta', async () => {
    const { email, password } = await crearUsuario();
    await loguear(email, password);

    for (let i = 0; i < 6; i++) await loguear(email, password, '000000');

    const st = await estado(email);
    expect(st.isLocked).toBe(0);
    expect(st.lockoutUntil).toBeNull();
  });
});

describe('Login — el código OTP no se invalida al pedirlo otra vez', () => {
  it('mantiene el mismo código vigente', async () => {
    const { email, password } = await crearUsuario();

    await loguear(email, password);
    const primerOtp = (await turso.execute(
      'SELECT otpCode FROM User WHERE email = ?', [email]
    )).rows[0].otpCode;

    await loguear(email, password);
    const segundoOtp = (await turso.execute(
      'SELECT otpCode FROM User WHERE email = ?', [email]
    )).rows[0].otpCode;

    expect(segundoOtp).toBe(primerOtp);
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

    // Y la contraseña nueva es la que vale.
    const ok = await loguear(email, 'NuevaClave456!');
    expect(ok.statusCode).toBe(206);
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
    expect(ok.statusCode).toBe(206);
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

describe('OTP — entrega de correo', () => {
  it('avisa cuando el correo no pudo enviarse en vez de decir "código enviado"', async () => {
    const { email, password } = await crearUsuario();

    emailMock.sendOTPEmail.mockResolvedValueOnce({ ok: false, error: 'SMTP caído' });

    const res = await loguear(email, password);
    expect(res.statusCode).toBe(503);
    expect(res.payload.otpDeliveryFailed).toBe(true);
  });
});

describe('clearLockoutState', () => {
  it('deja la cuenta sin ningún rastro de bloqueo', async () => {
    const { email } = await crearUsuario();
    await turso.execute(
      `UPDATE User SET isLocked = 1, lockoutUntil = '2099-01-01T00:00:00.000Z',
              lockoutCount = 3, failedAttempts = 2, otpAttempts = 4 WHERE email = ?`,
      [email]
    );

    const id = (await turso.execute('SELECT id FROM User WHERE email = ?', [email])).rows[0].id;
    await clearLockoutState(id);

    const st = await estado(email);
    expect(st.isLocked).toBe(0);
    expect(st.lockoutUntil).toBeNull();
    expect(st.lockoutCount).toBe(0);
    expect(st.failedAttempts).toBe(0);
    expect(st.otpAttempts).toBe(0);
  });
});

describe('generateOTP', () => {
  it('reutiliza el código vigente y fuerza uno nuevo con force', async () => {
    const { email } = await crearUsuario();

    const a = await generateOTP(email);
    const b = await generateOTP(email);
    expect(b).toBe(a);

    const c = await generateOTP(email, { force: true });
    expect(c).not.toBe(a);
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
