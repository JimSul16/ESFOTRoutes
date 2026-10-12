import { computeAdaptiveRoute, breakCycles } from '../src/services/graphAlgorithm.js';
import graphlib from 'graphlib';

describe('Pruebas Unitarias TDD: Algoritmo de Grafo Adaptativo (graphlib)', () => {

  test('Caso 1: DAG Lineal Acíclico respeta orden topológico estricto', () => {
    const topicsData = [
      {
        topicId: 'topicC',
        topicName: 'Enrutamiento OSPF',
        difficulty: 'Avanzado',
        estimatedMinutes: 60,
        selfLevel: 3,
        struggles: false,
        prerequisites: [{ id: 'topicB', name: 'Subnetting VLSM', strength: 'HARD' }]
      },
      {
        topicId: 'topicA',
        topicName: 'Fundamentos OSI',
        difficulty: 'Principiante',
        estimatedMinutes: 45,
        selfLevel: 3,
        struggles: false,
        prerequisites: []
      },
      {
        topicId: 'topicB',
        topicName: 'Subnetting VLSM',
        difficulty: 'Intermedio',
        estimatedMinutes: 50,
        selfLevel: 3,
        struggles: false,
        prerequisites: [{ id: 'topicA', name: 'Fundamentos OSI', strength: 'HARD' }]
      }
    ];

    const result = computeAdaptiveRoute(topicsData);
    const orderedIds = result.orderedTopics.map(t => t.topicId);

    expect(orderedIds).toEqual(['topicA', 'topicB', 'topicC']);
    expect(result.summary.totalTopics).toBe(3);
  });

  test('Caso 2: Prerrequisito HARD se coloca antes incluso si el estudiante reporta nivel alto en el tema dependiente', () => {
    const topicsData = [
      {
        topicId: 'advancedTopic',
        topicName: 'Seguridad con JWT',
        difficulty: 'Avanzado',
        estimatedMinutes: 80,
        selfLevel: 5, // Usuario dice ser experto
        struggles: false,
        prerequisites: [{ id: 'foundationalTopic', name: 'Node.js Express', strength: 'HARD' }]
      },
      {
        topicId: 'foundationalTopic',
        topicName: 'Node.js Express',
        difficulty: 'Intermedio',
        estimatedMinutes: 70,
        selfLevel: 1, // Usuario tiene base muy débil
        struggles: false,
        prerequisites: []
      }
    ];

    const result = computeAdaptiveRoute(topicsData);
    const orderedIds = result.orderedTopics.map(t => t.topicId);

    // foundationalTopic debe obligatoriamente ir primero
    expect(orderedIds[0]).toBe('foundationalTopic');
    expect(orderedIds[1]).toBe('advancedTopic');

    // foundationalTopic debe marcarse como refuerzo sugerido debido a nivel 1
    const found = result.orderedTopics.find(t => t.topicId === 'foundationalTopic');
    expect(found.isReinforcement).toBe(true);
    expect(found.badge).toContain('Refuerzo Sugerido');
  });

  test('Caso 3: Desarme de Ciclos desactiva dependencia SOFT y evita bucle infinito', () => {
    const g = new graphlib.Graph({ directed: true });
    const edgeMetadata = new Map();

    g.setNode('A');
    g.setNode('B');
    g.setNode('C');

    g.setEdge('A', 'B');
    edgeMetadata.set('A->B', { strength: 'HARD' });

    g.setEdge('B', 'C');
    edgeMetadata.set('B->C', { strength: 'HARD' });

    // Dependencia circular suave que cierra el ciclo A -> B -> C -> A
    g.setEdge('C', 'A');
    edgeMetadata.set('C->A', { strength: 'SOFT' });

    expect(graphlib.alg.isAcyclic(g)).toBe(false);

    const isNowAcyclic = breakCycles(g, edgeMetadata);
    expect(isNowAcyclic).toBe(true);
    expect(graphlib.alg.isAcyclic(g)).toBe(true);
  });

  test('Caso 4: Grafo Desconectado procesa todos los componentes sin omitir ningún tema', () => {
    const topicsData = [
      // Componente 1: Redes
      {
        topicId: 'netA',
        topicName: 'Capa Física',
        selfLevel: 3,
        prerequisites: []
      },
      {
        topicId: 'netB',
        topicName: 'Capa Enlace',
        selfLevel: 3,
        prerequisites: [{ id: 'netA', strength: 'HARD' }]
      },
      // Componente 2: Web (independiente)
      {
        topicId: 'webA',
        topicName: 'HTML Semántico',
        selfLevel: 3,
        prerequisites: []
      },
      {
        topicId: 'webB',
        topicName: 'CSS Moderno',
        selfLevel: 3,
        prerequisites: [{ id: 'webA', strength: 'HARD' }]
      }
    ];

    const result = computeAdaptiveRoute(topicsData);
    expect(result.orderedTopics.length).toBe(4);

    const orderedIds = result.orderedTopics.map(t => t.topicId);
    expect(orderedIds).toContain('netA');
    expect(orderedIds).toContain('netB');
    expect(orderedIds).toContain('webA');
    expect(orderedIds).toContain('webB');

    // netA antes de netB, y webA antes de webB
    expect(orderedIds.indexOf('netA')).toBeLessThan(orderedIds.indexOf('netB'));
    expect(orderedIds.indexOf('webA')).toBeLessThan(orderedIds.indexOf('webB'));
  });

  test('Caso 5: Temas con STRUGGLES_WITH reciben bonus de urgencia pedagógica (+20 pts)', () => {
    const topicsData = [
      {
        topicId: 'topicNormal',
        topicName: 'Protocolo DNS',
        selfLevel: 3,
        struggles: false,
        prerequisites: []
      },
      {
        topicId: 'topicStruggle',
        topicName: 'VLSM Subnetting',
        selfLevel: 3,
        struggles: true, // Dificultad detectada
        prerequisites: []
      }
    ];

    const result = computeAdaptiveRoute(topicsData);
    const struggleTopic = result.orderedTopics.find(t => t.topicId === 'topicStruggle');
    const normalTopic = result.orderedTopics.find(t => t.topicId === 'topicNormal');

    expect(struggleTopic.priorityScore).toBe(normalTopic.priorityScore + 20);
    expect(struggleTopic.isReinforcement).toBe(true);
    expect(result.orderedTopics[0].topicId).toBe('topicStruggle');
  });

});
