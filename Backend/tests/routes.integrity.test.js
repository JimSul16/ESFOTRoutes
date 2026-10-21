/**
 * Integridad de datos y autorización de las rutas — regresión de los bugs
 * críticos que encontró la revisión del 21/10/2026.
 *
 * El driver de Neo4j se mockea: estas pruebas no deben tocar la instancia
 * real (ni dejar sockets abiertos, que era lo que colgaba la suite).
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

const { turso } = await import('../src/config/turso.js');
const { runMigrations } = await import('../src/db/migrate.js');
const { createRoute, updateRoute, enrollRoute, completeModule, deleteRoute } = await import(
  '../src/controllers/routes.controller.js'
);

const mockRes = () => {
  const res = { status: 200, payload: null };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  return res;
};

let autorId;
let alumnoId;
let alumnoSinInscripcionId;
let rutaId;
let moduloId;

beforeAll(async () => {
  await runMigrations();

  const crearUsuario = async (email) => {
    const r = await turso.execute(
      `INSERT INTO User (name, email, password, isVerified, isActive) VALUES (?,?,?,1,1)`,
      ['Usuario Prueba', email, 'hash']
    );
    return Number(r.lastInsertRowid);
  };

  autorId = await crearUsuario('autor@epn.edu.ec');
  alumnoId = await crearUsuario('alumno@epn.edu.ec');
  alumnoSinInscripcionId = await crearUsuario('alumno2@epn.edu.ec');

  const ruta = await turso.execute(
    `INSERT INTO LearningRoute (title, subjectId, difficulty, authorId, isPublic)
     VALUES (?,?,?,?,1)`,
    ['Ruta de prueba', 'redes', 'BEGINNER', autorId]
  );
  rutaId = Number(ruta.lastInsertRowid);

  const mod = await turso.execute(
    `INSERT INTO Module (title, position, routeId) VALUES (?,?,?)`,
    ['Módulo 1', 1, rutaId]
  );
  moduloId = Number(mod.lastInsertRowid);

  await turso.execute('INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)', [
    alumnoId,
    rutaId,
  ]);
});

describe('updateRoute — no destruye el progreso de los alumnos', () => {
  test('conserva el ModuleProgress aunque el admin edite los módulos', async () => {
    // El alumno aprueba el módulo.
    await turso.execute(
      `INSERT INTO ModuleProgress (userId, moduleId, isPassed, score) VALUES (?,?,1,90)`,
      [alumnoId, moduloId]
    );

    const res = mockRes();
    await updateRoute(
      {
        user: { id: autorId },
        params: { id: String(rutaId) },
        body: {
          title: 'Ruta de prueba editada',
          category: 'Redes de Computadoras',
          modules: [{ title: 'Módulo 1', description: 'Editado', resourceIds: [] }],
        },
      },
      res
    );

    expect(res.statusCode).toBe(200);

    const progreso = await turso.execute('SELECT * FROM ModuleProgress');
    // Antes: `DELETE FROM Module WHERE routeId = ?` → el CASCADE borraba el
    // progreso de todos los alumnos (verificado: 1 → 0).
    expect(progreso.rows).toHaveLength(1);
  });

  test('el módulo conserva su id al editarlo (para no duplicar progreso)', async () => {
    const antes = await turso.execute('SELECT id FROM Module WHERE routeId = ?', [rutaId]);
    const idAntes = antes.rows[0].id;

    const res = mockRes();
    await updateRoute(
      {
        user: { id: autorId },
        params: { id: String(rutaId) },
        body: {
          title: 'Ruta de prueba editada',
          category: 'Redes de Computadoras',
          modules: [{ title: 'Módulo 1', description: 'Otra descripción', resourceIds: [] }],
        },
      },
      res
    );

    const despues = await turso.execute('SELECT id, description FROM Module WHERE routeId = ?', [
      rutaId,
    ]);

    expect(despues.rows).toHaveLength(1);
    expect(despues.rows[0].id).toBe(idAntes);
    expect(despues.rows[0].description).toBe('Otra descripción');
  });
});

describe('completeModule — exige inscripción en la ruta', () => {
  test('un alumno no inscrito NO consigue XP ni progreso', async () => {
    const res = mockRes();
    await completeModule(
      { user: { id: alumnoSinInscripcionId }, body: { moduleId: moduloId, score: 95, passed: true } },
      res
    );

    expect(res.statusCode).toBe(403);

    const usuario = await turso.execute('SELECT xp FROM User WHERE id = ?', [
      alumnoSinInscripcionId,
    ]);
    expect(Number(usuario.rows[0].xp)).toBe(0);

    const progreso = await turso.execute('SELECT * FROM ModuleProgress WHERE userId = ?', [
      alumnoSinInscripcionId,
    ]);
    expect(progreso.rows).toHaveLength(0);
  });

  test('un módulo ya aprobado no se puede volver a reprobar', async () => {
    const res = mockRes();
    await completeModule(
      { user: { id: alumnoId }, body: { moduleId: moduloId, score: 20, passed: false } },
      res
    );

    // Ni 400 ni "reprobado": el módulo ya estaba aprobado.
    expect(res.payload.passed).not.toBe(false);
    expect(res.payload.message).toMatch(/ya completado/i);
  });
});

describe('enrollRoute — no permite inscribirse en rutas privadas', () => {
  test('una ruta privada responde 403 a un alumno', async () => {
    const privada = await turso.execute(
      `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic) VALUES (?,?,?,0)`,
      ['Ruta privada', 'BEGINNER', autorId]
    );

    const res = mockRes();
    await enrollRoute({ user: { id: alumnoId }, params: { id: String(Number(privada.lastInsertRowid)) } }, res);

    expect(res.statusCode).toBe(403);
  });

  test('el autor de la ruta privada sí puede(opts) — no es un bloqueo para él', async () => {
    const privada = await turso.execute(
      `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic) VALUES (?,?,?,0)`,
      ['Ruta privada del autor', 'BEGINNER', autorId]
    );

    const res = mockRes();
    await enrollRoute({ user: { id: autorId }, params: { id: String(Number(privada.lastInsertRowid)) } }, res);

    expect(res.statusCode).toBe(201);
  });

  test('una ruta inexistente responde 404 (no 500 por FK)', async () => {
    const res = mockRes();
    await enrollRoute({ user: { id: alumnoId }, params: { id: '999999' } }, res);

    expect(res.statusCode).toBe(404);
  });
});

describe('Validación de ids — un id no numérico NO puede dar 500', () => {
  test('DELETE /routes/:id con id no numérico → 400', async () => {
    const res = mockRes();
    await deleteRoute({ user: { id: autorId }, params: { id: 'abc' } }, res);

    expect(res.statusCode).toBe(400);
  });

  test('PUT /routes/:id con id no numérico → 400', async () => {
    const res = mockRes();
    await updateRoute(
      { user: { id: autorId }, params: { id: 'abc' }, body: { title: 'x' } },
      res
    );

    expect(res.statusCode).toBe(400);
  });

  test('POST /routes/:id/enroll con id no numérico → 400', async () => {
    const res = mockRes();
    await enrollRoute({ user: { id: alumnoId }, params: { id: 'xyz' } }, res);

    expect(res.statusCode).toBe(400);
  });
});
