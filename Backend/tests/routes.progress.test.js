/**
 * Tests de `GET /routes/my-routes`: progreso por ruta y relación ruta↔materia.
 *
 * Usa una BD SQLite en memoria, así que no depende del estado de `dev.db`.
 * Regresión: el endpoint no devolvía `enrollments` ni `progress`, por lo que el
 * frontend leía `enrollments[0].progress` y mostraba siempre 0%.
 */
process.env.TURSO_DATABASE_URL = ':memory:';

const { turso } = await import('../src/config/turso.js');
const { runMigrations } = await import('../src/db/migrate.js');
const { getMyRoutes, completeModule, createRoute } = await import(
  '../src/controllers/routes.controller.js'
);

const mockRes = () => {
  const res = { status: 200, payload: null };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  return res;
};

let userId;
let routeId;

const miRuta = async () => {
  const res = mockRes();
  await getMyRoutes({ user: { id: userId }, body: {} }, res);
  return res.payload.find((r) => r.id === routeId);
};

const aprobarModulo = async (offset) => {
  const res = mockRes();
  const mod = await turso.execute(
    'SELECT id FROM Module WHERE routeId = ? ORDER BY position LIMIT 1 OFFSET ?',
    [routeId, offset]
  );
  await completeModule(
    { user: { id: userId }, body: { moduleId: mod.rows[0].id, score: 90, passed: true } },
    res
  );
  return res.payload;
};

beforeAll(async () => {
  await runMigrations();

  const user = await turso.execute(
    `INSERT INTO User (name, email, password, isVerified, isActive) VALUES (?,?,?,1,1)`,
    ['Estudiante Test', 'test.progresso@epn.edu.ec', 'hash']
  );
  userId = Number(user.lastInsertRowid);

  const route = await turso.execute(
    `INSERT INTO LearningRoute (title, category, difficulty, authorId, isPublic)
     VALUES (?,?,?,?,0)`,
    ['Ruta de prueba', 'Redes de Computadoras', 'BEGINNER', userId]
  );
  routeId = Number(route.lastInsertRowid);

  for (let i = 1; i <= 4; i++) {
    await turso.execute('INSERT INTO Module (title, position, routeId) VALUES (?,?,?)', [
      `Módulo ${i}`,
      i,
      routeId,
    ]);
  }

  await turso.execute('INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)', [
    userId,
    routeId,
  ]);
});

describe('GET /routes/my-routes — progreso y enrollments', () => {
  test('devuelve la ruta con enrollments reales y progreso 0 al empezar', async () => {
    const ruta = await miRuta();

    expect(ruta).toBeDefined();
    expect(ruta.enrollments).toHaveLength(1);
    expect(ruta.enrollments[0]).toMatchObject({ routeId });
    expect(ruta.progress).toBe(0);
  });

  test('el progreso sube según se aprueban módulos (0 → 25 → 50)', async () => {
    await aprobarModulo(0);
    expect((await miRuta()).progress).toBe(25);

    await aprobarModulo(1);
    expect((await miRuta()).progress).toBe(50);
  });

  test('Enrollment.progress queda sincronizado con el valor devuelto', async () => {
    const ruta = await miRuta();
    const enrollment = await turso.execute(
      'SELECT progress FROM Enrollment WHERE userId = ? AND learningRouteId = ?',
      [userId, routeId]
    );

    expect(Number(enrollment.rows[0].progress)).toBe(ruta.progress);
  });

  test('no cuenta dos veces un módulo ya completado', async () => {
    const antes = (await miRuta()).progress;
    const res = await aprobarModulo(0);

    expect(res.message).toMatch(/ya completado/i);
    expect((await miRuta()).progress).toBe(antes);
  });

  test('no reintenta dos veces una ruta sin módulos', async () => {
    const res = mockRes();
    const route = await turso.execute(
      `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic) VALUES (?,?,?,0)`,
      ['Ruta vacía', 'BEGINNER', userId]
    );

    await getMyRoutes({ user: { id: userId }, body: {} }, res);

    const vacia = res.payload.find((r) => r.id === Number(route.lastInsertRowid));
    expect(vacia.progress).toBe(0);
    expect(vacia.enrollments).toEqual([]);
  });
});

describe('LearningRoute.subjectId — relación con el grafo', () => {
  test('createRoute deduce el subjectId a partir de la categoría', async () => {
    const res = mockRes();
    await createRoute(
      {
        user: { id: userId },
        body: { title: 'Ruta admin', category: 'Desarrollo de Aplicaciones Web', modules: [] },
      },
      res
    );

    expect(res.statusCode).toBe(201);

    const saved = await turso.execute('SELECT subjectId FROM LearningRoute WHERE id = ?', [
      res.payload.route.id,
    ]);
    expect(saved.rows[0].subjectId).toBe('web');
  });

  test('createRoute respeta un subjectId explícito', async () => {
    const res = mockRes();
    await createRoute(
      {
        user: { id: userId },
        body: {
          title: 'Ruta con materia explícita',
          category: 'Generada por IA',
          subjectId: 'redes',
          modules: [],
        },
      },
      res
    );

    const saved = await turso.execute('SELECT subjectId FROM LearningRoute WHERE id = ?', [
      res.payload.route.id,
    ]);
    expect(saved.rows[0].subjectId).toBe('redes');
  });

  test('una categoría desconocida deja subjectId en null, no inventa', async () => {
    const res = mockRes();
    await createRoute(
      { user: { id: userId }, body: { title: 'Otra materia', category: 'Física', modules: [] } },
      res
    );

    const saved = await turso.execute('SELECT subjectId FROM LearningRoute WHERE id = ?', [
      res.payload.route.id,
    ]);
    expect(saved.rows[0].subjectId).toBeNull();
  });
});