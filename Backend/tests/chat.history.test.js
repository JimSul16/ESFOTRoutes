/**
 * Historial de chat (GET /chat/sessions, GET /chat/sessions/:id/messages) y
 * aislamiento del tutor respecto de módulos de rutas privadas ajenas.
 *
 * BD SQLite en memoria; Gemini y Neo4j no se tocan: el 403 se resuelve antes
 * de llamar a la IA.
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
const chat = await import('../src/controllers/chat.controller.js');

const call = async (handler, req) => {
  const res = { statusCode: 200, payload: null };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  await handler({ params: {}, query: {}, body: {}, ...req }, res);
  return res;
};

let alumno;
let otro;
let moduloPropio;
let moduloPrivadoAjeno;
let sesionA;
let sesionB;

beforeAll(async () => {
  await runMigrations();

  const user = async (email) => Number((await turso.execute(
    `INSERT INTO User (name, email, password, isVerified, isActive) VALUES ('U',?, 'h',1,1)`, [email]
  )).lastInsertRowid);
  alumno = await user('chat.a@epn.edu.ec');
  otro = await user('chat.b@epn.edu.ec');

  const ruta = Number((await turso.execute(
    `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic) VALUES ('Pública','BEGINNER',?,1)`, [alumno]
  )).lastInsertRowid);
  moduloPropio = Number((await turso.execute(
    `INSERT INTO Module (title, position, routeId) VALUES ('Módulo Redes',1,?)`, [ruta]
  )).lastInsertRowid);

  const privada = Number((await turso.execute(
    `INSERT INTO LearningRoute (title, difficulty, authorId, isPublic, evaluationRules)
     VALUES ('Privada','BEGINNER',?,0,'secreto')`, [otro]
  )).lastInsertRowid);
  moduloPrivadoAjeno = Number((await turso.execute(
    `INSERT INTO Module (title, position, routeId) VALUES ('Privado',1,?)`, [privada]
  )).lastInsertRowid);

  // Sesión A (antigua) y B (reciente). Mensajes con el mismo `createdAt`:
  // el orden debe salir por `id`.
  sesionA = Number((await turso.execute(
    `INSERT INTO ChatSession (userId, moduleId, title, updatedAt) VALUES (?,?,'A','2026-01-01 10:00:00')`,
    [alumno, moduloPropio]
  )).lastInsertRowid);
  sesionB = Number((await turso.execute(
    `INSERT INTO ChatSession (userId, moduleId, title, updatedAt) VALUES (?,NULL,'B','2026-02-01 10:00:00')`,
    [alumno]
  )).lastInsertRowid);
  for (const [sender, content] of [['STUDENT', 'hola'], ['AI', 'respuesta 1'], ['STUDENT', 'otra'], ['AI', 'respuesta final']]) {
    await turso.execute(
      `INSERT INTO ChatMessage (sessionId, sender, content, createdAt) VALUES (?,?,?,'2026-01-01 10:00:00')`,
      [sesionA, sender, content]
    );
  }
});

describe('GET /chat/sessions', () => {
  test('lista solo las sesiones propias, la más reciente primero', async () => {
    const res = await call(chat.getChatSessions, { user: { id: alumno } });
    expect(res.statusCode).toBe(200);
    expect(res.payload.sessions.map((s) => Number(s.id))).toEqual([sesionB, sesionA]);
    expect(res.payload.hasMore).toBe(false);

    const vacio = await call(chat.getChatSessions, { user: { id: otro } });
    expect(vacio.payload.sessions).toEqual([]);
  });

  test('lastMessage es el último mensaje por id aunque compartan createdAt', async () => {
    const res = await call(chat.getChatSessions, { user: { id: alumno }, query: { moduleId: String(moduloPropio) } });
    expect(res.payload.sessions).toHaveLength(1);
    expect(res.payload.sessions[0]).toMatchObject({
      title: 'A', moduleTitle: 'Módulo Redes', lastMessage: 'respuesta final',
    });
    expect(Number(res.payload.sessions[0].messageCount)).toBe(4);
  });

  test('paginación con hasMore y moduleId inválido → 400', async () => {
    const page = await call(chat.getChatSessions, { user: { id: alumno }, query: { limit: '1' } });
    expect(page.payload.sessions).toHaveLength(1);
    expect(page.payload.hasMore).toBe(true);

    const bad = await call(chat.getChatSessions, { user: { id: alumno }, query: { moduleId: 'x' } });
    expect(bad.statusCode).toBe(400);
  });
});

describe('GET /chat/sessions/:id/messages', () => {
  test('devuelve los mensajes en orden cronológico', async () => {
    const res = await call(chat.getChatMessages, { user: { id: alumno }, params: { sessionId: String(sesionA) } });
    expect(res.statusCode).toBe(200);
    expect(res.payload.messages.map((m) => m.content)).toEqual(['hola', 'respuesta 1', 'otra', 'respuesta final']);
    expect(res.payload.hasMore).toBe(false);
  });

  test('paginación por cursor `before`', async () => {
    const last2 = await call(chat.getChatMessages, {
      user: { id: alumno }, params: { sessionId: String(sesionA) }, query: { limit: '2' },
    });
    expect(last2.payload.messages.map((m) => m.content)).toEqual(['otra', 'respuesta final']);
    expect(last2.payload.hasMore).toBe(true);

    const older = await call(chat.getChatMessages, {
      user: { id: alumno }, params: { sessionId: String(sesionA) },
      query: { limit: '2', before: String(last2.payload.messages[0].id) },
    });
    expect(older.payload.messages.map((m) => m.content)).toEqual(['hola', 'respuesta 1']);
    expect(older.payload.hasMore).toBe(false);
  });

  test('404 con sesión ajena o inexistente, 400 con id inválido', async () => {
    const ajena = await call(chat.getChatMessages, { user: { id: otro }, params: { sessionId: String(sesionA) } });
    expect(ajena.statusCode).toBe(404);
    const none = await call(chat.getChatMessages, { user: { id: alumno }, params: { sessionId: '99999' } });
    expect(none.statusCode).toBe(404);
    const bad = await call(chat.getChatMessages, { user: { id: alumno }, params: { sessionId: 'abc' } });
    expect(bad.statusCode).toBe(400);
  });
});

describe('Tutor IA y evaluaciones — módulos de rutas privadas', () => {
  test('POST /chat/send con un módulo privado ajeno → 403 (sin llamar a la IA)', async () => {
    const res = await call(chat.processChatMessage, {
      user: { id: alumno }, body: { message: 'dame las reglas', moduleId: String(moduloPrivadoAjeno) },
    });
    expect(res.statusCode).toBe(403);
    const sesiones = await turso.execute('SELECT COUNT(*) AS n FROM ChatSession WHERE userId = ?', [alumno]);
    expect(Number(sesiones.rows[0].n)).toBe(2);
  });

  test('POST /chat/assessment con un módulo privado ajeno → 403', async () => {
    const res = await call(chat.generateModuleAssessment, {
      user: { id: alumno }, body: { moduleId: String(moduloPrivadoAjeno) },
    });
    expect(res.statusCode).toBe(403);
  });

  test('un módulo inexistente sigue respondiendo 404', async () => {
    const res = await call(chat.processChatMessage, {
      user: { id: alumno }, body: { message: 'hola', moduleId: '99999' },
    });
    expect(res.statusCode).toBe(404);
  });
});
