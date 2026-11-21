/**
 * Aislamiento de rutas personales, progreso 60/40 y catálogo de recursos.
 *
 * BD SQLite en memoria; Neo4j, Gemini y el grafo curricular se mockean para
 * no tocar servicios reales.
 */
import { jest } from '@jest/globals';

process.env.TURSO_DATABASE_URL = ':memory:';

const markModuleStruggle = jest.fn();
jest.unstable_mockModule('../src/services/neo4j.service.js', () => ({
  syncRouteToGraph: jest.fn(),
  deleteRouteFromGraph: jest.fn(),
  markModuleAsCompleted: jest.fn(),
  markModuleStruggle,
  getDriver: jest.fn(() => null),
  closeDriver: jest.fn(),
}));

// La IA devuelve una ruta SIN `category`: antes eso disparaba un
// ReferenceError (variable `category` inexistente) y un 500.
const aiRoute = {
  title: 'Ruta IA de prueba',
  description: 'Generada en el test',
  evaluationRules: 'Reglas secretas de evaluación',
  modules: [
    { title: 'IA M1', resources: [{ title: 'Recurso IA', url: 'https://ia.example.com/r1', type: 'LINK' }] },
    { title: 'IA M2', resources: [] },
  ],
};
jest.unstable_mockModule('../src/services/chat.service.js', () => ({
  executeWithGeminiCascade: jest.fn(async () => structuredClone(aiRoute)),
  generateCurricularFallbackAssessment: jest.fn(() => ({ questions: [], practicalChallenge: {} })),
}));

jest.unstable_mockModule('../src/services/knowledgeGraph.service.js', () => ({
  syncEnrollmentToGraph: jest.fn(),
  getUserSubjectKnowledgeData: jest.fn(async () => [
    {
      topicId: 'redes-intro', topicName: 'Introducción', difficulty: 'Principiante',
      estimatedMinutes: 30, selfLevel: 2, struggles: false, prerequisites: [],
      moduleId: 'm1', moduleName: 'Fundamentos', modulePosition: 1, resources: [],
    },
  ]),
}));

const { turso } = await import('../src/config/turso.js');
const { runMigrations } = await import('../src/db/migrate.js');
const routes = await import('../src/controllers/routes.controller.js');
const { getCatalog, getResources } = await import('../src/controllers/resource.controller.js');
const { generateAndPersistAdaptiveRoute } = await import('../src/services/graphAlgorithm.js');

const call = async (handler, req) => {
  const res = { statusCode: 200, payload: null };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  await handler({ params: {}, query: {}, body: {}, ...req }, res);
  return res;
};

const ids = {};

const crearUsuario = async (email, role) => {
  const r = await turso.execute(
    `INSERT INTO User (name, email, password, isVerified, isActive) VALUES (?,?,?,1,1)`,
    ['Usuario', email, 'hash']
  );
  const id = Number(r.lastInsertRowid);
  await turso.execute(
    `INSERT INTO UserRole (userId, roleId) SELECT ?, id FROM Role WHERE name = ?`,
    [id, role]
  );
  return id;
};

beforeAll(async () => {
  await runMigrations();
  await turso.execute(`INSERT OR IGNORE INTO Role (name) VALUES ('ADMIN'), ('STUDENT')`);

  ids.admin = await crearUsuario('admin@epn.edu.ec', 'ADMIN');
  ids.autor = await crearUsuario('autor@epn.edu.ec', 'STUDENT');
  ids.otro = await crearUsuario('otro@epn.edu.ec', 'STUDENT');

  // Ruta pública del admin: 2 módulos, 2 recursos.
  const pub = await turso.execute(
    `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic) VALUES ('Pública','BEGINNER',?,1)`,
    [ids.admin]
  );
  ids.publicRoute = Number(pub.lastInsertRowid);
  const m1 = await turso.execute(`INSERT INTO Module (title, position, routeId) VALUES ('P1',1,?)`, [ids.publicRoute]);
  const m2 = await turso.execute(`INSERT INTO Module (title, position, routeId) VALUES ('P2',2,?)`, [ids.publicRoute]);
  ids.pubM1 = Number(m1.lastInsertRowid);
  ids.pubM2 = Number(m2.lastInsertRowid);
  const r1 = await turso.execute(`INSERT INTO Resource (title, type, url, authorId) VALUES ('R1','LINK','https://a.example.com/1',?)`, [ids.admin]);
  const r2 = await turso.execute(`INSERT INTO Resource (title, type, url, authorId) VALUES ('R2','LINK','https://a.example.com/2',?)`, [ids.admin]);
  ids.res1 = Number(r1.lastInsertRowid);
  ids.res2 = Number(r2.lastInsertRowid);
  await turso.execute(`INSERT INTO ModuleResource (moduleId, resourceId, position) VALUES (?,?,1)`, [ids.pubM1, ids.res1]);
  await turso.execute(`INSERT INTO ModuleResource (moduleId, resourceId, position) VALUES (?,?,1)`, [ids.pubM2, ids.res2]);
  await turso.execute(`INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)`, [ids.otro, ids.publicRoute]);
});

describe('Aislamiento de rutas personales', () => {
  test('la ruta IA se crea privada, con matrícula del autor (sin subjectId → no 500)', async () => {
    const res = await call(routes.generatePersonalizedRoute, {
      user: { id: ids.autor }, body: { topic: 'Redes', difficulty: 'BEGINNER' },
    });
    expect(res.statusCode).toBe(201);
    ids.aiRoute = Number(res.payload.route.id);
    ids.aiModule = Number(res.payload.route.modules[0].id);
    ids.aiResource = Number(res.payload.route.modules[0].resources[0].id);

    const row = await turso.execute('SELECT isPublic FROM LearningRoute WHERE id = ?', [ids.aiRoute]);
    expect(Number(row.rows[0].isPublic)).toBe(0);
    const enr = await turso.execute(
      'SELECT progress FROM Enrollment WHERE userId = ? AND learningRouteId = ?', [ids.autor, ids.aiRoute]
    );
    expect(enr.rows).toHaveLength(1);
  });

  test('el autor puede registrar progreso en su ruta IA (antes 403)', async () => {
    const res = await call(routes.completeModule, {
      user: { id: ids.autor }, body: { moduleId: ids.aiModule, score: 90, passed: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload.xpGained).toBe(50);
  });

  test('la ruta adaptativa del autodiagnóstico se guarda privada y matriculada', async () => {
    const result = await generateAndPersistAdaptiveRoute({ userId: ids.autor, subjectId: 'redes', authorId: ids.autor });
    ids.adaptiveRoute = Number(result.routeId);
    const row = await turso.execute('SELECT isPublic FROM LearningRoute WHERE id = ?', [ids.adaptiveRoute]);
    expect(Number(row.rows[0].isPublic)).toBe(0);
    const enr = await turso.execute(
      'SELECT 1 FROM Enrollment WHERE userId = ? AND learningRouteId = ?', [ids.autor, ids.adaptiveRoute]
    );
    expect(enr.rows).toHaveLength(1);
  });

  test('GET /routes no devuelve rutas generadas por estudiantes', async () => {
    const res = await call(routes.getRoutes, { user: { id: ids.otro } });
    const routeIds = res.payload.map((r) => Number(r.id));
    expect(routeIds).toContain(ids.publicRoute);
    expect(routeIds).not.toContain(ids.aiRoute);
    expect(routeIds).not.toContain(ids.adaptiveRoute);
  });

  test('otro estudiante recibe 403 en GET /routes/:id de una ruta privada ajena', async () => {
    for (const routeId of [ids.aiRoute, ids.adaptiveRoute]) {
      const res = await call(routes.getRouteById, { user: { id: ids.otro }, params: { id: String(routeId) } });
      expect(res.statusCode).toBe(403);
      expect(JSON.stringify(res.payload)).not.toMatch(/Reglas secretas/);
    }
  });

  test('el autor y el admin sí leen la ruta privada; una ruta inexistente da 404', async () => {
    const autor = await call(routes.getRouteById, { user: { id: ids.autor }, params: { id: String(ids.aiRoute) } });
    expect(autor.statusCode).toBe(200);
    expect(autor.payload.progress).toBeGreaterThan(0);

    const admin = await call(routes.getRouteById, { user: { id: ids.admin }, params: { id: String(ids.aiRoute) } });
    expect(admin.statusCode).toBe(200);

    const none = await call(routes.getRouteById, { user: { id: ids.otro }, params: { id: '999999' } });
    expect(none.statusCode).toBe(404);
  });

  test('un alumno inscrito antes de privatizar la ruta conserva el acceso', async () => {
    await turso.execute(`INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)`, [ids.otro, ids.adaptiveRoute]);
    const res = await call(routes.getRouteById, { user: { id: ids.otro }, params: { id: String(ids.adaptiveRoute) } });
    expect(res.statusCode).toBe(200);
    await turso.execute(`DELETE FROM Enrollment WHERE userId = ? AND learningRouteId = ?`, [ids.otro, ids.adaptiveRoute]);
  });

  test('las evaluaciones de un módulo privado ajeno responden 403', async () => {
    const res = await call(routes.getModuleAssessments, {
      user: { id: ids.otro }, params: { moduleId: String(ids.aiModule) },
    });
    expect(res.statusCode).toBe(403);
  });

  test('el catálogo de recursos no muestra los recursos de rutas privadas a otros alumnos', async () => {
    const catalog = await call(getCatalog, { user: { id: ids.otro } });
    const catalogIds = catalog.payload.resources.map((r) => Number(r.id));
    expect(catalogIds).toContain(ids.res1);
    expect(catalogIds).not.toContain(ids.aiResource);

    const list = await call(getResources, { user: { id: ids.otro } });
    expect(list.payload.map((r) => Number(r.id))).not.toContain(ids.aiResource);

    const asAdmin = await call(getResources, { user: { id: ids.admin } });
    expect(asAdmin.payload.map((r) => Number(r.id))).toContain(ids.aiResource);
  });
});

describe('Progreso 60/40 (recursos + evaluaciones)', () => {
  const progressOf = async () => {
    const res = await call(routes.getRouteById, { user: { id: ids.otro }, params: { id: String(ids.publicRoute) } });
    return res.payload;
  };

  test('abrir un recurso suma su parte del 60 % y actualiza Enrollment.progress', async () => {
    const res = await call(routes.openResource, { user: { id: ids.otro }, params: { id: String(ids.res1) } });
    expect(res.statusCode).toBe(200);
    expect(res.payload.firstOpen).toBe(true);
    // 1 de 2 recursos → 30; 0 de 3 evaluaciones → 0.
    expect(res.payload.progressByRoute).toEqual([{ routeId: ids.publicRoute, progress: 30 }]);

    const enr = await turso.execute(
      'SELECT progress FROM Enrollment WHERE userId = ? AND learningRouteId = ?', [ids.otro, ids.publicRoute]
    );
    expect(Number(enr.rows[0].progress)).toBe(30);

    const route = await progressOf();
    expect(route.progress).toBe(30);
    expect(route.openedResourceIds).toEqual([String(ids.res1)]);
  });

  test('abrir el mismo recurso es idempotente', async () => {
    const res = await call(routes.openResource, { user: { id: ids.otro }, params: { id: String(ids.res1) } });
    expect(res.payload.firstOpen).toBe(false);
    const rows = await turso.execute('SELECT * FROM ResourceAccess WHERE userId = ?', [ids.otro]);
    expect(rows.rows).toHaveLength(1);
  });

  test('un recurso fuera de las rutas inscritas responde 404; un id inválido 400', async () => {
    const ajeno = await call(routes.openResource, { user: { id: ids.otro }, params: { id: String(ids.aiResource) } });
    expect(ajeno.statusCode).toBe(404);
    const invalido = await call(routes.openResource, { user: { id: ids.otro }, params: { id: 'abc' } });
    expect(invalido.statusCode).toBe(400);
  });

  test('el reto final solo se acepta en el último módulo', async () => {
    const res = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM1, score: 90, passed: true, assessmentType: 'completa' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('un tipo de evaluación desconocido responde 400', async () => {
    const res = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM1, score: 90, passed: true, assessmentType: 'otro' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('cuestionario y reto final del mismo módulo se cuentan por separado', async () => {
    const teoria = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM2, score: 80, passed: true, assessmentType: 'teoria' },
    });
    expect(teoria.payload.xpGained).toBe(50);
    // 30 (recursos) + 1/3 * 40 = 43
    expect(teoria.payload.progress).toBe(43);

    const reto = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM2, score: 85, passed: true, assessmentType: 'completa' },
    });
    expect(reto.statusCode).toBe(200);
    expect(reto.payload.xpGained).toBe(50);
    expect(reto.payload.assessmentType).toBe('completa');
    expect(reto.payload.progress).toBe(57);

    const repetido = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM2, score: 85, passed: true, assessmentType: 'completa' },
    });
    expect(repetido.payload.xpGained).toBe(0);
    expect(repetido.payload.message).toMatch(/ya fue aprobada/i);

    const route = await progressOf();
    const mod = route.modules.find((m) => Number(m.id) === ids.pubM2);
    expect(mod).toMatchObject({ isPassed: true, passedTheory: true, passedPractice: true });
  });

  test('reprobar el reto de un módulo ya aprobado NO lo marca como dificultad', async () => {
    markModuleStruggle.mockClear();
    // Nuevo alumno en la ruta pública: aprueba el cuestionario del último
    // módulo y luego suspende el reto final.
    const alumno = await crearUsuario('alumno3@epn.edu.ec', 'STUDENT');
    await turso.execute(`INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)`, [alumno, ids.publicRoute]);
    await call(routes.completeModule, {
      user: { id: alumno }, body: { moduleId: ids.pubM2, score: 90, passed: true, assessmentType: 'teoria' },
    });
    const res = await call(routes.completeModule, {
      user: { id: alumno }, body: { moduleId: ids.pubM2, score: 30, passed: false, assessmentType: 'completa' },
    });
    expect(res.payload.passed).toBe(false);
    expect(markModuleStruggle).not.toHaveBeenCalled();
  });

  test('la práctica es formativa: 200 sin XP ni progreso', async () => {
    const res = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM1, score: 90, passed: true, assessmentType: 'practica' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload.xpGained).toBe(0);
    expect(res.payload.progress).toBe(57);
  });

  test('con todo abierto y aprobado la ruta llega al 100 %', async () => {
    await call(routes.openResource, { user: { id: ids.otro }, params: { id: String(ids.res2) } });
    const res = await call(routes.completeModule, {
      user: { id: ids.otro }, body: { moduleId: ids.pubM1, score: 90, passed: true, assessmentType: 'teoria' },
    });
    expect(res.payload.progress).toBe(100);

    const mine = await call(routes.getMyRoutes, { user: { id: ids.otro } });
    expect(mine.payload.find((r) => Number(r.id) === ids.publicRoute).progress).toBe(100);
  });
});
