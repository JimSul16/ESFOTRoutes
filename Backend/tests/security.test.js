/**
 * Seguridad — regresión de los hallazgos críticos de la revisión del
 * 21/10/2026 (XSS reflejado, prototipo en la cadena, validación de entrada).
 */
import { jest } from '@jest/globals';

process.env.TURSO_DATABASE_URL = ':memory:';

jest.unstable_mockModule('../src/services/neo4j.service.js', () => ({
  syncRouteToGraph: jest.fn(),
  deleteRouteFromGraph: jest.fn(),
  markModuleAsCompleted: jest.fn(),
  markModuleStruggle: jest.fn(),
  getDriver: jest.fn(() => null),
  closeDriver: jest.fn(),
}));

const { escapeHtml, isValidEmail, parseId } = await import('../src/utils/index.js');
const { renderUnlockAccountForm } = await import('../src/controllers/auth.controller.js');
const { executeCode } = await import('../src/controllers/execute.controller.js');
const { register, updateProfile } = await import('../src/controllers/auth.controller.js');
const { createUser } = await import('../src/controllers/admin.controller.js');

// Campos académicos válidos (RR-003 / RR-005): obligatorios en registro,
// perfil y alta de usuarios desde el panel de admin.
const academicOk = { career: 'Sistemas de Información', semester: 5, uniqueId: '123456789' };

const mockRes = () => {
  const res = { status: 200, payload: null, body: '' };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  res.send = (b) => { res.body = b; return res; };
  return res;
};

describe('escapeHtml — el XSS reflejado', () => {
  test('escapa los caracteres que ejecutan HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(escapeHtml("'><svg/onload=alert(1)>")).toBe(
      '&#039;&gt;&lt;svg/onload=alert(1)&gt;'
    );
  });

  test('no rompe el texto normal', () => {
    expect(escapeHtml('Ana María')).toBe('Ana María');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('el formulario de desbloqueo NO inyecta HTML con el token de la URL', () => {
    const res = mockRes();
    renderUnlockAccountForm(
      { params: { token: '"><script>alert(document.domain)</script>' } },
      res
    );

    expect(res.body).not.toContain('<script>');
    expect(res.body).toContain('&lt;script&gt;');
  });
});

describe('parseId — un id no numérico no puede producir NaN', () => {
  test('rechaza lo que no es un entero positivo', () => {
    expect(parseId('abc')).toBeNull();
    expect(parseId('')).toBeNull();
    expect(parseId('-3')).toBeNull();
    expect(parseId('0')).toBeNull();
    expect(parseId(undefined)).toBeNull();
  });

  test('acepta los ids válidos', () => {
    expect(parseId('42')).toBe(42);
    expect(parseId(42)).toBe(42);
  });
});

describe('isValidEmail — el registro no acepta cualquier cosa', () => {
  test('rechaza los formatos inválidos', () => {
    expect(isValidEmail('sin-arroba')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail(12345)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  test('acepta los correos normales', () => {
    expect(isValidEmail('ana@epn.edu.ec')).toBe(true);
    expect(isValidEmail('user@gmail.com')).toBe(true);
  });
});

describe('register — validaciones de entrada', () => {
  test('un email con formato inválido devuelve 400 (no 500)', async () => {
    const res = mockRes();
    await register(
      { body: { name: 'Ana', email: 'correo-malo', password: 'contrasena1', ...academicOk } },
      res
    );

    expect(res.statusCode).toBe(400);
  });

  test('una contraseña no-string devuelve 400 (no 500 en bcrypt)', async () => {
    const res = mockRes();
    await register(
      { body: { name: 'Ana', email: 'ana@epn.edu.ec', password: 12345678, ...academicOk } },
      res
    );

    expect(res.statusCode).toBe(400);
  });
});

describe('register — carrera, semestre e ID único son obligatorios (RR-003/RR-005)', () => {
  test('registrarse solo con nombre, correo y contraseña responde 400', async () => {
    const res = mockRes();
    await register(
      { body: { name: 'Ana', email: 'ana@epn.edu.ec', password: 'contrasena1' } },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('carrera');
  });

  test('sin semestre responde 400', async () => {
    const res = mockRes();
    await register(
      {
        body: {
          name: 'Ana',
          email: 'ana@epn.edu.ec',
          password: 'contrasena1',
          career: academicOk.career,
          uniqueId: academicOk.uniqueId,
        },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('semestre');
  });

  test('sin ID único responde 400', async () => {
    const res = mockRes();
    await register(
      {
        body: {
          name: 'Ana',
          email: 'ana@epn.edu.ec',
          password: 'contrasena1',
          career: academicOk.career,
          semester: academicOk.semester,
        },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('identificador único');
  });
});

describe('updateProfile — carrera y semestre obligatorios en el perfil (RR-003)', () => {
  test('guardar solo el nombre responde 400 (el frontend debe enviar carrera/semestre)', async () => {
    const res = mockRes();
    await updateProfile({ user: { id: 1 }, body: { name: 'Nombre Nuevo' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('carrera');
  });

  test('no se puede borrar la carrera enviándola en null → 400', async () => {
    const res = mockRes();
    await updateProfile({ user: { id: 1 }, body: { career: null, semester: 5 } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('carrera');
  });
});

describe('admin createUser — campos académicos obligatorios', () => {
  test('crear usuario sin ID único responde 400', async () => {
    const res = mockRes();
    await createUser(
      {
        body: {
          name: 'Profesor Redes',
          email: 'profe.redes@epn.edu.ec',
          password: 'Password123!',
          roleName: 'ADMIN',
          career: 'Docente en Redes',
          semester: 1,
        },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('identificador único');
  });

  test('crear usuario sin carrera responde 400', async () => {
    const res = mockRes();
    await createUser(
      {
        body: {
          name: 'Profesor Redes',
          email: 'profe.redes@epn.edu.ec',
          password: 'Password123!',
          roleName: 'ADMIN',
          semester: 1,
          uniqueId: '987654321',
        },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain('carrera');
  });
});

describe('executeCode — no resuelve el lenguaje por la cadena de prototipos', () => {
  test('"constructor" no produce un language undefined en la petición a JDoodle', async () => {
    const originalFetch = global.fetch;
    let enviado = null;

    global.fetch = jest.fn(async (_url, options) => {
      enviado = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ output: 'hola', statusCode: 200, memory: 1 }),
      };
    });

    try {
      const res = mockRes();
      await executeCode(
        { body: { language: 'constructor', code: 'print(1)' } },
        res
      );

      expect(res.statusCode).toBe(200);
      // Antes `languageMap['constructor']` devolvía la función heredada y se
      // enviaba `language: undefined` a JDoodle.
      expect(enviado.language).toBe('python3');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('CORS — orígenes válidos', () => {
  const allowedPattern = /^https:\/\/(esfotroutes|tic-rutas-aprendizaje)(-[a-z0-9-]+)?\.vercel\.app$/;

  test('permite el dominio de producción principal esfotroutes.vercel.app', () => {
    expect(allowedPattern.test('https://esfotroutes.vercel.app')).toBe(true);
  });

  test('permite previews de Vercel para esfotroutes', () => {
    expect(allowedPattern.test('https://esfotroutes-git-main-epn.vercel.app')).toBe(true);
  });

  test('permite tic-rutas-aprendizaje.vercel.app', () => {
    expect(allowedPattern.test('https://tic-rutas-aprendizaje.vercel.app')).toBe(true);
  });

  test('bloquea dominios de atacantes que intenten suplantar el origen', () => {
    expect(allowedPattern.test('https://esfotroutes.vercel.app.attacker.com')).toBe(false);
    expect(allowedPattern.test('http://esfotroutes.vercel.app')).toBe(false);
    expect(allowedPattern.test('https://malicious-site.com')).toBe(false);
  });
});
