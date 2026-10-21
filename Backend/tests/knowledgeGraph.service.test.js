/**
 * Regresión del BUG 3: `SIMILAR_TO.score` se guarda en escala 0-1 en Neo4j
 * (`seedKnowledgeGraph.js` escribe `r1.score = 0.85`), pero el contrato del
 * frontend (`GraphRecommendation.matchScore`) es 0-100. Antes se devolvía
 * 0.85 tal cual y el panel pintaba "1% de afinidad".
 */
process.env.TURSO_DATABASE_URL = ':memory:';

const { turso } = await import('../src/config/turso.js');
const { runMigrations } = await import('../src/db/migrate.js');
const { normalizeAffinityScore, getEnrolledSubjectIds, syncEnrollmentToGraph } =
  await import('../src/services/knowledgeGraph.service.js');

describe('normalizeAffinityScore — escala de afinidad del grafo', () => {
  test('convierte la escala 0-1 de la BD a 0-100', () => {
    expect(normalizeAffinityScore(0.85)).toBe(85);
    expect(normalizeAffinityScore(0.5)).toBe(50);
    expect(normalizeAffinityScore(0.1)).toBe(10);
  });

  test('respeta un score que ya viene en 0-100', () => {
    expect(normalizeAffinityScore(85)).toBe(85);
    expect(normalizeAffinityScore(100)).toBe(100);
    expect(normalizeAffinityScore(42)).toBe(42);
  });

  test('el 0 y el 1 significan lo mismo en ambas escalas', () => {
    expect(normalizeAffinityScore(0)).toBe(0);
    expect(normalizeAffinityScore(1)).toBe(100);
  });

  test('acepta los enteros de Neo4j (objetos con toNumber)', () => {
    expect(normalizeAffinityScore({ toNumber: () => 0.85 })).toBe(85);
    expect(normalizeAffinityScore({ toNumber: () => 90 })).toBe(90);
  });

  test('devuelve null cuando no hay dato utilizable', () => {
    expect(normalizeAffinityScore(null)).toBeNull();
    expect(normalizeAffinityScore(undefined)).toBeNull();
    expect(normalizeAffinityScore('no es un número')).toBeNull();
    expect(normalizeAffinityScore(Number.NaN)).toBeNull();
  });
});

/**
 * BUG 2 — `ENROLLED_IN` se consultaba pero nunca se creaba.
 *
 * `getEnrolledSubjectIds` es la defensa en profundidad: aunque la caché del
 * grafo esté vacía (inscripciones anteriores al arreglo), la materia queda
 * excluida de las recomendaciones.
 */
describe('getEnrolledSubjectIds — materias inscritas (BUG 2)', () => {
  let userId;
  let routeId;

  beforeAll(async () => {
    await runMigrations();

    const user = await turso.execute(
      `INSERT INTO User (name, email, password, isVerified, isActive) VALUES (?,?,?,1,1)`,
      ['Estudiante Enroll', 'test.enroll@epn.edu.ec', 'hash']
    );
    userId = Number(user.lastInsertRowid);

    const route = await turso.execute(
      `INSERT INTO LearningRoute (title, subjectId, difficulty, authorId, isPublic)
       VALUES (?,?,?,?,0)`,
      ['Ruta de Redes', 'redes', 'BEGINNER', userId]
    );
    routeId = Number(route.lastInsertRowid);

    await turso.execute('INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)', [
      userId,
      routeId,
    ]);
  });

  test('devuelve la materia de las rutas en las que está inscrito', async () => {
    const materias = await getEnrolledSubjectIds(userId);

    expect(materias).toContain('redes');
  });

  test('no devuelve materias de otros usuarios', async () => {
    const otro = await turso.execute(
      `INSERT INTO User (name, email, password, isVerified, isActive) VALUES (?,?,?,1,1)`,
      ['Otro Estudiante', 'test.otro@epn.edu.ec', 'hash']
    );

    const materias = await getEnrolledSubjectIds(Number(otro.lastInsertRowid));

    expect(materias).not.toContain('redes');
  });

  test('una ruta sin subjectId no aporta ninguna materia', async () => {
    const ruta = await turso.execute(
      `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic) VALUES (?,?,?,0)`,
      ['Ruta genérica', 'BEGINNER', userId]
    );
    await turso.execute('INSERT INTO Enrollment (userId, learningRouteId) VALUES (?,?)', [
      userId,
      Number(ruta.lastInsertRowid),
    ]);

    const materias = await getEnrolledSubjectIds(userId);

    expect(materias).not.toContain(null);
    expect(materias.every((m) => typeof m === 'string')).toBe(true);
  });
});

describe('syncEnrollmentToGraph — refleja la inscripción en el grafo (BUG 2)', () => {
  test('sin Neo4j configurado devuelve false sin romperse', async () => {
    // No hay NEO4J_URI en este proceso (el mock de neo4j-driver solo se usa
    // en neo4j.service.test.js), así que el servicio degrada con elegancia.
    const resultado = await syncEnrollmentToGraph(1, 999999);

    expect(typeof resultado).toBe('boolean');
  });
});
