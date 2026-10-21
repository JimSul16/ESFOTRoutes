/**
 * Capa de escritura en Neo4j — la que no tenía ni un solo test.
 *
 * Aquí viven los BUG 1 (`COMPLETED`/`STRUGGLES_WITH` que nunca llegaban a los
 * `Topic`), el BUG 2 (`ENROLLED_IN`) y el BUG 5 (`Module` huérfanos al borrar
 * una ruta). El grafo real no se puede usar en una prueba unitaria, así que se
 * comprueba el **contrato de las consultas Cypher**: que las aristas y el
 * orden de borrado sean los correctos.
 *
 * Si alguien borra la cláusula `CONTAINS_TOPIC` de una consulta, estas pruebas
 * fallan (que es justo lo que dejó pasar el BUG 1).
 */
import { jest } from '@jest/globals';

process.env.NEO4J_URI = 'neo4j://test.local';
process.env.NEO4J_PASSWORD = 'test-password';
process.env.NEO4J_DATABASE = 'neo4j';

const run = jest.fn().mockResolvedValue({ records: [] });
const close = jest.fn();
const session = { run, close };
const driver = { session: jest.fn(() => session), close: jest.fn() };

jest.unstable_mockModule('neo4j-driver', () => ({
  default: {
    driver: jest.fn(() => driver),
    auth: { basic: jest.fn(() => ({ username: 'u', password: 'p' })) },
  },
}));

const {
  syncRouteToGraph,
  markModuleAsCompleted,
  markModuleStruggle,
  deleteRouteFromGraph,
} = await import('../src/services/neo4j.service.js');

/** Todas las consultas que se han ejecutado, en orden. */
const consultas = () => run.mock.calls.map(([query]) => query);
const algunaConsulta = (fragmento) =>
  consultas().some((q) => q.includes(fragmento));

beforeEach(() => {
  run.mockClear();
  close.mockClear();
  run.mockResolvedValue({ records: [] });
});

describe('syncRouteToGraph — enlaces módulo ↔ tema (BUG 1)', () => {
  test('crea el nodo de la ruta y la arista CONTAINS del módulo', async () => {
    await syncRouteToGraph(7, 'Ruta adaptativa', 'Redes de Computadoras', [
      { title: 'Módulo 1', topicIds: ['redes-intro'] },
    ]);

    expect(algunaConsulta('MERGE (r:LearningRoute {tursoId: $routeId})')).toBe(true);
    expect(algunaConsulta('MERGE (r)-[:CONTAINS]->(m)')).toBe(true);
  });

  test('crea la arista CONTAINS_TOPIC hacia cada tema curricular del módulo', async () => {
    await syncRouteToGraph(7, 'Ruta adaptativa', 'Redes', [
      { title: 'Módulo 1', topicIds: ['redes-intro', 'redes-osi-tcp'] },
    ]);

    const conTopics = consultas().filter((q) => q.includes('CONTAINS_TOPIC'));
    expect(conTopics).toHaveLength(2);
    expect(conTopics[0]).toContain('MATCH (t:Topic {id: $topicId})');
    expect(conTopics[0]).toContain('MERGE (m)-[:CONTAINS_TOPIC]->(t)');
  });

  test('un módulo sin topics no intenta crear aristas (las rutas del admin)', async () => {
    await syncRouteToGraph(7, 'Ruta manual', 'General', [{ title: 'Módulo manual' }]);

    expect(algunaConsulta('CONTAINS_TOPIC')).toBe(false);
  });

  test('ignora los topicIds vacíos', async () => {
    await syncRouteToGraph(7, 'Ruta adaptativa', 'Redes', [
      { title: 'Módulo 1', topicIds: [null, undefined, ''] },
    ]);

    expect(algunaConsulta('CONTAINS_TOPIC')).toBe(false);
  });
});

describe('markModuleAsCompleted — el progreso llega a los Topic (BUG 1)', () => {
  test('marca COMPLETED en el módulo runtime y en sus temas', async () => {
    await markModuleAsCompleted(78, 7, 'Módulo 1', 90);

    expect(algunaConsulta('MERGE (u)-[c:COMPLETED]->(m)')).toBe(true);
    expect(
      algunaConsulta('MATCH (m:Module {title: $modTitle, routeId: $routeId})-[:CONTAINS_TOPIC]->(t:Topic)')
    ).toBe(true);
    expect(algunaConsulta('MERGE (u)-[tc:COMPLETED]->(t)')).toBe(true);
  });

  test('incluye el respaldo por nombre para los módulos que no son curriculares', async () => {
    await markModuleAsCompleted(78, 7, 'Módulo 1', 90);

    expect(algunaConsulta('cm.id IS NOT NULL')).toBe(true);
    expect(algunaConsulta('MERGE (u)-[tc2:COMPLETED]->(ct)')).toBe(true);
  });

  test('al aprobar, borra el STRUGGLES_WITH del módulo y de sus temas', async () => {
    await markModuleAsCompleted(78, 7, 'Módulo 1', 90);

    expect(algunaConsulta('DELETE sw')).toBe(true);
    expect(algunaConsulta('DELETE tsw')).toBe(true);
  });

  test('el score se propaga a los temas', async () => {
    await markModuleAsCompleted(78, 7, 'Módulo 1', 90);

    const conScore = run.mock.calls.filter(([, params]) => params?.score === 90);
    expect(conScore.length).toBeGreaterThan(0);
  });
});

describe('markModuleStruggle — la dificultad llega a los Topic (BUG 1)', () => {
  test('marca STRUGGLES_WITH en el módulo runtime y en sus temas', async () => {
    await markModuleStruggle(78, 7, 'Módulo 1', 30, 'Reprobó examen de módulo');

    expect(algunaConsulta('MERGE (u)-[sw:STRUGGLES_WITH]->(m)')).toBe(true);
    expect(algunaConsulta('MERGE (u)-[tsw:STRUGGLES_WITH]->(t)')).toBe(true);
  });

  test('incluye el respaldo por nombre', async () => {
    await markModuleStruggle(78, 7, 'Módulo 1', 30);

    expect(algunaConsulta('MERGE (u)-[tsw2:STRUGGLES_WITH]->(ct)')).toBe(true);
  });
});

describe('deleteRouteFromGraph — sin módulos huérfanos (BUG 5)', () => {
  test('borra los Module runtime de la ruta ANTES de borrar la ruta', async () => {
    await deleteRouteFromGraph(7);

    const orden = consultas();
    const indiceModulos = orden.findIndex((q) => q.includes('MATCH (m:Module {routeId: $routeId})'));
    const indiceRuta = orden.findIndex((q) => q.includes('MATCH (r:LearningRoute {tursoId: $routeId})'));

    expect(indiceModulos).toBeGreaterThanOrEqual(0);
    expect(indiceRuta).toBeGreaterThanOrEqual(0);
    expect(indiceModulos).toBeLessThan(indiceRuta);
  });

  test('los módulos se borran con DETACH (no dejan aristas sueltas)', async () => {
    await deleteRouteFromGraph(7);

    expect(algunaConsulta('MATCH (m:Module {routeId: $routeId})\n       DETACH DELETE m')).toBe(true);
  });

  test('la ruta también se borra en cascada', async () => {
    await deleteRouteFromGraph(7);

    expect(algunaConsulta('DETACH DELETE r')).toBe(true);
  });
});
