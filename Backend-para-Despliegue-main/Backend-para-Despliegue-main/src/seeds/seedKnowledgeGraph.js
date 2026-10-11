import { getDriver, verifyNeo4jConnection } from '../services/neo4j.service.js';
import { initGraphConstraints } from '../services/knowledgeGraph.service.js';
import { redesSubject } from './seedRedes.js';
import { webSubject } from './seedAplicacionesWeb.js';
import 'dotenv/config';

const getSession = (driver) => {
  const database = process.env.NEO4J_DATABASE || 'neo4j';
  return driver.session({ database });
};

const seedSubject = async (session, subjectData) => {
  console.log(`📌 Sembrando materia: ${subjectData.name} (${subjectData.id})...`);

  // 1. Crear / actualizar Subject
  await session.run(`
    MERGE (s:Subject {id: $id})
    SET s.name = $name,
        s.code = $code,
        s.description = $description,
        s.credits = $credits
  `, {
    id: subjectData.id,
    name: subjectData.name,
    code: subjectData.code,
    description: subjectData.description,
    credits: subjectData.credits
  });

  // 2. Crear módulos y temas
  for (const mod of subjectData.modules) {
    await session.run(`
      MATCH (s:Subject {id: $subjectId})
      MERGE (m:Module {id: $moduleId})
      SET m.name = $name,
          m.position = $position,
          m.description = $description,
          m.subjectId = $subjectId
      MERGE (s)-[:HAS_MODULE]->(m)
    `, {
      subjectId: subjectData.id,
      moduleId: mod.id,
      name: mod.name,
      position: mod.position,
      description: mod.description
    });

    for (const topic of mod.topics) {
      await session.run(`
        MATCH (m:Module {id: $moduleId})
        MERGE (t:Topic {id: $topicId})
        SET t.name = $name,
            t.description = $description,
            t.difficulty = $difficulty,
            t.estimatedMinutes = $estimatedMinutes
        MERGE (m)-[:CONTAINS_TOPIC]->(t)
      `, {
        moduleId: mod.id,
        topicId: topic.id,
        name: topic.name,
        description: topic.description,
        difficulty: topic.difficulty,
        estimatedMinutes: topic.estimatedMinutes
      });

      // Recursos
      if (topic.resources && topic.resources.length > 0) {
        for (const res of topic.resources) {
          await session.run(`
            MATCH (t:Topic {id: $topicId})
            MERGE (r:Resource {id: $resId})
            SET r.title = $title,
                r.url = $url,
                r.type = $type
            MERGE (t)-[:HAS_RESOURCE]->(r)
          `, {
            topicId: topic.id,
            resId: res.id,
            title: res.title,
            url: res.url,
            type: res.type
          });
        }
      }
    }
  }

  // 3. Crear relaciones de PREREQUISITE dentro de la materia
  for (const mod of subjectData.modules) {
    for (const topic of mod.topics) {
      if (topic.prerequisites && topic.prerequisites.length > 0) {
        for (const prereq of topic.prerequisites) {
          await session.run(`
            MATCH (t:Topic {id: $topicId})
            MATCH (p:Topic {id: $targetId})
            MERGE (t)-[rel:PREREQUISITE]->(p)
            SET rel.strength = $strength
          `, {
            topicId: topic.id,
            targetId: prereq.targetId,
            strength: prereq.strength || 'HARD'
          });
        }
      }
    }
  }
};

const runMasterSeed = async () => {
  console.log('🚀 Iniciando sembrado del Grafo de Conocimiento Curricular en Neo4j AuraDB...');

  const connected = await verifyNeo4jConnection();
  if (!connected) {
    console.error('❌ No se pudo conectar a Neo4j AuraDB. Abortando seed.');
    process.exit(1);
  }

  const driver = getDriver();
  const session = getSession(driver);

  try {
    // Paso 1: Inicializar restricciones e índices
    console.log('🔧 Verificando restricciones de integridad...');
    await initGraphConstraints();

    // Paso 2: Sembrar Redes de Computadoras
    await seedSubject(session, redesSubject);

    // Paso 3: Sembrar Aplicaciones Web
    await seedSubject(session, webSubject);

    // Paso 4: Relaciones Cruzadas e Interdisciplinarias
    console.log('🔗 Creando relaciones cruzadas SIMILAR_TO y dependencias interdisciplinarias...');
    await session.run(`
      MATCH (s1:Subject {id: 'redes'}), (s2:Subject {id: 'web'})
      MERGE (s1)-[r1:SIMILAR_TO]->(s2)
      SET r1.score = 0.85,
          r1.reason = 'Comparte protocolos HTTP/TCP/DNS con Desarrollo Web'
      MERGE (s2)-[r2:SIMILAR_TO]->(s1)
      SET r2.score = 0.85,
          r2.reason = 'Aplica fundamentos de redes para comunicación cliente-servidor'
    `);

    // Prerrequisito cruzado suave: web-fundamentos requiere redes-tcp-udp
    await session.run(`
      MATCH (t1:Topic {id: 'web-fundamentos'})
      MATCH (t2:Topic {id: 'redes-tcp-udp'})
      MERGE (t1)-[rel:PREREQUISITE]->(t2)
      SET rel.strength = 'SOFT'
    `);

    // Paso 5: Verificación de Conteos en el Grafo
    const statsResult = await session.run(`
      MATCH (s:Subject)
      OPTIONAL MATCH (m:Module)
      OPTIONAL MATCH (t:Topic)
      OPTIONAL MATCH (r:Resource)
      OPTIONAL MATCH ()-[p:PREREQUISITE]->()
      RETURN count(DISTINCT s) AS totalSubjects,
             count(DISTINCT m) AS totalModules,
             count(DISTINCT t) AS totalTopics,
             count(DISTINCT r) AS totalResources,
             count(DISTINCT p) AS totalPrereqs
    `);

    const stats = statsResult.records[0];
    console.log('\n📊 ══════════ RESUMEN DEL GRAFO CURRICULAR EN NEO4J ══════════');
    console.log(` Materias (Subject):     ${stats.get('totalSubjects')}`);
    console.log(` Módulos (Module):       ${stats.get('totalModules')}`);
    console.log(` Temas (Topic):          ${stats.get('totalTopics')}`);
    console.log(` Recursos (Resource):    ${stats.get('totalResources')}`);
    console.log(` Prerrequisitos (Links): ${stats.get('totalPrereqs')}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎉 Grafo Curricular inicializado y sembrado con éxito!');
  } catch (error) {
    console.error('❌ Error durante la ejecución del seed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
};

runMasterSeed();
