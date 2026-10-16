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

  test('Caso 6: Diferenciación adaptativa entre Nivel 1 (Principiante) y Nivel 5 (Avanzado)', () => {
    const rawTopics = [
      {
        topicId: 't1',
        topicName: 'Fundamentos de Redes',
        difficulty: 'Principiante',
        estimatedMinutes: 60,
        prerequisites: []
      },
      {
        topicId: 't2',
        topicName: 'Subnetting IPv4',
        difficulty: 'Intermedio',
        estimatedMinutes: 60,
        prerequisites: [{ id: 't1', strength: 'HARD' }]
      },
      {
        topicId: 't3',
        topicName: 'Enrutamiento Dinámico',
        difficulty: 'Avanzado',
        estimatedMinutes: 60,
        prerequisites: [{ id: 't2', strength: 'HARD' }]
      }
    ];

    // Simular estudiante Nivel 1 (Sin conocimientos)
    const level1Data = rawTopics.map(t => ({ ...t, selfLevel: 1, struggles: false }));
    const resultLevel1 = computeAdaptiveRoute(level1Data);

    // Simular estudiante Nivel 5 (Conocimiento pleno)
    const level5Data = rawTopics.map(t => ({ ...t, selfLevel: 5, struggles: false }));
    const resultLevel5 = computeAdaptiveRoute(level5Data);

    // 1. Verificación de perfil de aprendizaje
    expect(resultLevel1.profile).toBe('BEGINNER');
    expect(resultLevel5.profile).toBe('ADVANCED');

    // 2. Verificación de tiempos estimados adaptativos
    // Nivel 1 debe tener factor de tiempo incrementado (160%) para nivelación pausada
    // Nivel 5 debe tener factor de tiempo reducido (40%) para fast-track
    expect(resultLevel1.summary.totalEstimatedMinutes).toBeGreaterThan(resultLevel5.summary.totalEstimatedMinutes);
    expect(resultLevel1.orderedTopics[0].estimatedMinutes).toBe(Math.round(60 * 1.6));
    expect(resultLevel5.orderedTopics[0].estimatedMinutes).toBe(Math.round(60 * 0.4));

    // 3. Verificación de Insignias y Metadatos Pedagógicos
    expect(resultLevel1.orderedTopics[0].badge).toBe('⚡ Refuerzo Sugerido');
    expect(resultLevel5.orderedTopics[0].badge).toBe('⭐ Dominio Avanzado Acreditado');

    // 4. Verificación de la estructura modular diferenciada
    expect(resultLevel1.modules[0].title).toContain('Nivelación');
    expect(resultLevel5.modules[0].title).toContain('Maestría');
  });

  test('Caso 7: Perfil Mixto organiza módulo inicial de acreditación y módulo intensivo de refuerzo', () => {
    const mixedTopics = [
      {
        topicId: 't1',
        topicName: 'HTML5 y CSS3',
        difficulty: 'Principiante',
        estimatedMinutes: 50,
        selfLevel: 5, // Dominado
        struggles: false,
        prerequisites: []
      },
      {
        topicId: 't2',
        topicName: 'JavaScript Asíncrono',
        difficulty: 'Intermedio',
        estimatedMinutes: 60,
        selfLevel: 1, // Dificultad
        struggles: true,
        prerequisites: [{ id: 't1', strength: 'HARD' }]
      },
      {
        topicId: 't3',
        topicName: 'React Framework',
        difficulty: 'Avanzado',
        estimatedMinutes: 70,
        selfLevel: 3, // Estándar
        struggles: false,
        prerequisites: [{ id: 't2', strength: 'HARD' }]
      }
    ];

    const result = computeAdaptiveRoute(mixedTopics);

    expect(result.profile).toBe('ADAPTIVE');
    expect(result.modules.length).toBeGreaterThanOrEqual(2);
    // Módulo 1 consolida temas acreditados
    expect(result.modules[0].title).toContain('Convalidación');
    expect(result.modules[0].topics[0].topicId).toBe('t1');
    // Módulo 2 refuerza temas con dificultad
    expect(result.modules[1].title).toContain('Nivelación y Refuerzo');
    expect(result.modules[1].topics[0].topicId).toBe('t2');
  });

});

