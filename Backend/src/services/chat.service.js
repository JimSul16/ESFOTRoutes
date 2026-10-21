import { GoogleGenerativeAI } from '@google/generative-ai';
import { turso } from '../config/turso.js';
import { prepareResourceForGemini } from './resourceParser.service.js';
import { getDriver } from './neo4j.service.js';
import { getTopicContextForChat, markTopicStruggle, getModuleTopicsForChat } from './knowledgeGraph.service.js';
import 'dotenv/config';

export const PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.5-flash';
export const BACKUP_MODEL = process.env.GEMINI_BACKUP_MODEL || 'gemini-3.5-flash-lite';

const getPrimaryAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
};

const getBackupAI = () => {
  const key = process.env.GEMINI_API_KEY_BACKUP || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
};

/**
 * Despachador en cascada de Gemini AI:
 * Nivel 1: Modelo primario (ej. gemini-3.5-flash) con GEMINI_API_KEY
 * Nivel 2: Modelo de respaldo (ej. gemini-3.5-flash-lite) con GEMINI_API_KEY_BACKUP
 * Nivel 3: El llamador ejecuta su fallback offline curricular
 */
export const executeWithGeminiCascade = async (executeFn) => {
  const primaryAI = getPrimaryAI();
  const backupAI = getBackupAI();

  // Nivel 1: Modelo Primario
  if (primaryAI) {
    try {
      return await executeFn({ genAI: primaryAI, modelName: PRIMARY_MODEL, tier: 1 });
    } catch (err) {
      console.warn(`⚠️ [Gemini Cascada Nivel 1 Falló] (${PRIMARY_MODEL}): ${err.message}. Conmutando a Nivel 2 (${BACKUP_MODEL})...`);
    }
  }

  // Nivel 2: Modelo de Respaldo
  if (backupAI) {
    try {
      return await executeFn({ genAI: backupAI, modelName: BACKUP_MODEL, tier: 2 });
    } catch (err) {
      console.warn(`⚠️ [Gemini Cascada Nivel 2 Falló] (${BACKUP_MODEL}): ${err.message}. Se activará Nivel 3 (Offline / Contingencia)...`);
    }
  }

  throw new Error('Todos los niveles de Gemini API fallaron o alcanzaron su límite de cuota.');
};

/**
 * Actualiza el perfil de aprendizaje del estudiante de forma asíncrona
 */
export const updateStudentProfile = async (userId, studentMessage, aiMessage, currentProfile) => {
  try {
    const analysisPrompt = `
      Analiza la siguiente interacción entre un estudiante y un tutor de la Escuela Politécnica Nacional (ESFOT).
      Mensaje del estudiante: "${studentMessage}"
      Respuesta del tutor: "${aiMessage}"
      Perfil de aprendizaje actual del estudiante: "${currentProfile || 'No definido aún.'}"
      
      Actualiza el perfil de aprendizaje sintetizando su nivel de comprensión, dudas recurrentes y estilo preferido.
      Devuelve ÚNICAMENTE el texto actualizado del perfil de forma concisa.
    `;

    const updatedProfile = await executeWithGeminiCascade(async ({ genAI, modelName }) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(analysisPrompt);
      return result.response.text().trim();
    });

    await turso.execute({
      sql: `UPDATE User SET learningProfile = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [updatedProfile, userId]
    });
  } catch (err) {
    // Error silencioso para no bloquear el flujo de respuesta
    console.warn('⚠️ No se pudo actualizar el perfil de aprendizaje:', err.message);
  }
};

/**
 * Procesa un mensaje de tutoría aplicando GraphRAG contextual
 */
export const generateChatResponse = async ({ userId, moduleId, topicId, routeId, message, sessionId, user }) => {
  // 1. Obtener o crear sesión
  let session;
  if (sessionId) {
    const sResult = await turso.execute({
      sql: `SELECT * FROM ChatSession WHERE id = ? AND userId = ?`,
      args: [parseInt(sessionId, 10), userId]
    });
    session = sResult.rows[0];
  }

  if (!session) {
    await turso.execute({
      sql: `INSERT INTO ChatSession (userId, moduleId, title) VALUES (?, ?, 'Sesión de Tutoría IA')`,
      args: [userId, moduleId ? parseInt(moduleId, 10) : null]
    });
    const sResult = await turso.execute({
      sql: `SELECT * FROM ChatSession WHERE userId = ? ORDER BY id DESC LIMIT 1`,
      args: [userId]
    });
    session = sResult.rows[0];
  }

  // 2. Guardar mensaje del estudiante en Turso
  await turso.execute({
    sql: `INSERT INTO ChatMessage (sessionId, sender, content) VALUES (?, 'STUDENT', ?)`,
    args: [session.id, message]
  });

  // 3. Obtener contexto de material del módulo
  let moduleContext = 'Consulta general del estudiante.';
  let moduleTitle = null;
  let moduleRouteId = null;

  if (moduleId) {
    const modResult = await turso.execute({
      sql: `SELECT m.*, lr.evaluationRules FROM Module m
            JOIN LearningRoute lr ON lr.id = m.routeId
            WHERE m.id = ?`,
      args: [parseInt(moduleId, 10)]
    });

    if (modResult.rows.length) {
      const moduleData = modResult.rows[0];
      moduleTitle = moduleData.title;
      moduleRouteId = moduleData.routeId;
      moduleContext = `Módulo: ${moduleData.title}\nDescripción: ${moduleData.description}\nReglas de Evaluación: ${moduleData.evaluationRules || 'Ninguna'}\n\nContenido del material de estudio:\n`;

      const resourcesResult = await turso.execute({
        sql: `SELECT r.* FROM Resource r JOIN ModuleResource mr ON mr.resourceId = r.id WHERE mr.moduleId = ?`,
        args: [parseInt(moduleId, 10)]
      });

      const parsedResources = await Promise.all(resourcesResult.rows.map(r => prepareResourceForGemini(r)));
      let combined = parsedResources.join('\n');
      if (combined.length > 150000) combined = combined.substring(0, 150000) + '\n\n[Contenido truncado]';
      moduleContext += combined;
    }
  }

  // 4. GraphRAG: subgrafo del tema del módulo.
  //
  // BUG 4: el frontend nunca mandaba `topicId`, así que el tutor recibía
  // siempre el contexto global débil y la detección de bloqueo
  // (`markTopicStruggle`) nunca se ejecutaba. Ahora el tema se resuelve en
  // dos niveles:
  //   1) el `topicId` que envía el cliente, si lo hay;
  //   2) el grafo: los `Module` runtime enlazan con sus `Topic` curriculares
  //      mediante `CONTAINS_TOPIC`, así que el módulo basta para saber de qué
  //      temas trata.
  let resolvedTopicId = topicId ? String(topicId) : null;
  let topicGraph = null;

  if (resolvedTopicId) {
    topicGraph = await getTopicContextForChat(resolvedTopicId);
  }

  if (!topicGraph && moduleTitle && (moduleRouteId || routeId)) {
    // `moduleRouteId` (el de Turso) es el dato fiable; el `routeId` del
    // cliente solo acota la búsqueda en el grafo.
    const moduleTopics = await getModuleTopicsForChat(moduleRouteId ?? routeId, moduleTitle);
    if (moduleTopics.length > 0) {
      resolvedTopicId = moduleTopics[0].id;
      topicGraph = await getTopicContextForChat(resolvedTopicId);
    }
  }

  let graphContext = '';
  if (topicGraph) {
    const prereqsList = topicGraph.prerequisites.map(p => `${p.name} (${p.strength})`).join(', ') || 'Ninguno';
    const unlocksList = topicGraph.unlocks.join(', ') || 'Conceptos terminales';
    graphContext = `
[CONTEXTO ESPECÍFICO DEL GRAFO DE CONOCIMIENTO (GraphRAG)]
- Materia: ${topicGraph.subjectName} | Módulo: ${topicGraph.moduleName}
- Tema Actual: ${topicGraph.name} (${topicGraph.difficulty})
- Prerrequisitos que el estudiante debió dominar antes: ${prereqsList}
- Temas que este concepto desbloquea en la carrera: ${unlocksList}
`;
  } else {
    // Si no hay tema resoluble, extraer resumen del grafo global
    try {
      const driver = getDriver();
      if (driver) {
        const neo4jSession = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
        const graphRes = await neo4jSession.run(`
          MATCH (s:Subject)-[:HAS_MODULE]->(m:Module)
          RETURN s.name AS subject, collect(m.name) AS modules
          LIMIT 5
        `);
        const routesInfo = graphRes.records.map(rec => `- Materia: ${rec.get('subject')}. Módulos: ${rec.get('modules').join(', ')}`).join('\n');
        if (routesInfo) {
          graphContext = `\nContexto Curricular Global (Neo4j AuraDB):\n${routesInfo}\n`;
        }
        await neo4jSession.close();
      }
    } catch (_) {}
  }

  // 5. Configurar Prompt de Sistema
  const systemPrompt = `
    Eres un profesor tutor riguroso de la Escuela Politécnica Nacional (EPN), específicamente de la ESFOT.
    Tu objetivo es guiar y evaluar al estudiante basándote en el material de estudio y en la estructura conceptual del Grafo de Conocimiento:

    ${moduleContext}
    ${graphContext}

    Perfil de aprendizaje dinámico del estudiante:
    ${user?.learningProfile || 'Estudiante politécnico, fomenta el razonamiento crítico y la práctica.'}

    Reglas Pedagógicas:
    1. Si el estudiante presenta vacíos conceptuales en los prerrequisitos mencionados en el grafo, sugiérele repasar dichos prerrequisitos.
    2. Evita definiciones memorísticas; plantea escenarios prácticos de ingeniería, lógica de programación y redes.
    3. Exige análisis de arquitecturas, protocolos o bloques de código según corresponda.
    4. Mantén un tono académico, motivador y directo.
  `;

  // 6. Cargar Historial
  const historyResult = await turso.execute({
    sql: `SELECT * FROM ChatMessage WHERE sessionId = ? ORDER BY createdAt ASC`,
    args: [session.id]
  });

  const history = historyResult.rows.slice(0, -1).map(msg => ({
    role: msg.sender === 'STUDENT' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  let aiResponseText = '';
  try {
    aiResponseText = await executeWithGeminiCascade(async ({ genAI, modelName }) => {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      return result.response.text();
    });
  } catch (llmErr) {
    console.warn(`⚠️ Error en llamada a Gemini Chat en todos los niveles (${llmErr.message}). Utilizando respuesta pedagógica de contingencia...`);
    aiResponseText = `Hola ${user?.name || 'estudiante'}, como tutor curricular de la ESFOT estoy aquí para orientarte.

${topicGraph ? `Sobre el tema **${topicGraph.name}**: ${topicGraph.description}\nPrerrequisitos clave: ${topicGraph.prerequisites?.map(p => p.name).join(', ') || 'Concepto base'}.` : 'He recibido tu consulta sobre el material del módulo actual.'}

Te sugiero repasar los recursos didácticos del módulo y verificar cada paso con las guías de laboratorio. Si tienes dudas en un bloque de código o ejercicio puntual, compártelo detallando el paso donde se produce el inconveniente.`;
  }

  // 7. Guardar respuesta del Tutor IA
  await turso.execute({
    sql: `INSERT INTO ChatMessage (sessionId, sender, content) VALUES (?, 'AI', ?)`,
    args: [session.id, aiResponseText]
  });

  const aiMsgResult = await turso.execute({
    sql: `SELECT * FROM ChatMessage WHERE sessionId = ? ORDER BY id DESC LIMIT 1`,
    args: [session.id]
  });

  // 8. Detección automática de dificultades si el estudiante manifiesta bloqueo
  const struggleKeywords = ['no entiendo nada', 'estoy confundido', 'no puedo resolver', 'se me hace muy difícil', 'no comprendo'];
  const lowerMsg = message.toLowerCase();
  if (resolvedTopicId && struggleKeywords.some(kw => lowerMsg.includes(kw))) {
    markTopicStruggle(userId, resolvedTopicId, 'Estudiante reportó dificultad o confusión directa en chat.');
  }

  // Actualizar perfil de aprendizaje
  updateStudentProfile(userId, message, aiResponseText, user?.learningProfile);

  return {
    sessionId: session.id,
    reply: aiMsgResult.rows[0]
  };
};

/**
 * Genera la prueba dinámica de módulo
 */
export const generateModuleAssessmentService = async (moduleId, type = 'completa') => {
  // Verificar caché
  const existingAssessmentRes = await turso.execute({
    sql: `SELECT content FROM ModuleAssessment WHERE moduleId = ? AND type = ? ORDER BY createdAt DESC LIMIT 1`,
    args: [parseInt(moduleId, 10), type]
  });

  if (existingAssessmentRes.rows.length > 0) {
    try {
      return JSON.parse(existingAssessmentRes.rows[0].content);
    } catch (_) {}
  }

  const modResult = await turso.execute({
    sql: `SELECT m.*, lr.evaluationRules FROM Module m
          JOIN LearningRoute lr ON lr.id = m.routeId
          WHERE m.id = ?`,
    args: [parseInt(moduleId, 10)]
  });

  if (!modResult.rows.length) {
    throw new Error('Módulo no encontrado.');
  }

  const moduleData = modResult.rows[0];
  const resourcesResult = await turso.execute({
    sql: `SELECT r.* FROM Resource r JOIN ModuleResource mr ON mr.resourceId = r.id WHERE mr.moduleId = ?`,
    args: [parseInt(moduleId, 10)]
  });

  let contextText = `Módulo: ${moduleData.title}\nReglas de Evaluación: ${moduleData.evaluationRules || 'Ninguna'}\n\nContenido de los recursos:\n`;
  const parsedResources = await Promise.all(resourcesResult.rows.map(r => prepareResourceForGemini(r)));
  let combined = parsedResources.join('\n');
  if (combined.length > 150000) combined = combined.substring(0, 150000) + '\n\n[Contenido truncado]';
  contextText += combined;

  const practicalRules = `IMPORTANTE: El editor es un lienzo multitarea. Indica al estudiante que seleccione "Markdown / Texto Libre" o bloques de código según la tarea.`;

  let promptInstructions = '';
  let fewShotExample = '';

  if (type === 'teoria') {
    promptInstructions = 'Genera EXACTAMENTE 5 preguntas de tipo "multiple_choice" o "true_false".';
    fewShotExample = '{"questions": [{"id": 1, "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "..."}]}';
  } else if (type === 'practica') {
    promptInstructions = `Genera UN "practicalChallenge" SENCILLO con UNA SOLA tarea.\n${practicalRules}`;
    fewShotExample = '{"practicalChallenge": {"title": "...", "context": "...", "tasks": [{"id": "t1", "description": "..."}]}}';
  } else {
    promptInstructions = `Genera ENTRE 10 Y 15 PREGUNTAS y un "practicalChallenge" integrador con 3-5 tareas.\n${practicalRules}`;
    fewShotExample = '{"questions": [...], "practicalChallenge": {"title": "...", "context": "...", "tasks": [...]}}';
  }

  const systemPrompt = `
    Eres un profesor evaluador exigente de la EPN. Crea material de evaluación EXCLUSIVAMENTE basado en este material:
    ${contextText}
    ${promptInstructions}
    Devuelve ÚNICAMENTE JSON puro. EJEMPLO: ${fewShotExample}
  `;

  let finalJson = null;

  try {
    finalJson = await executeWithGeminiCascade(async ({ genAI, modelName }) => {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
      const chat = model.startChat();
      const result = await chat.sendMessage('Genera la evaluación ahora. Responde SOLO con el JSON puro.');
      let aiResponseText = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(aiResponseText);
    });
  } catch (err) {
    console.warn(`⚠️ Error al generar evaluación con Gemini en todos los niveles (${err.message}). Activando Nivel 3: Generador curricular offline...`);
    finalJson = generateCurricularFallbackAssessment(moduleData, resourcesResult.rows, type);
  }

  await turso.execute({
    sql: `INSERT INTO ModuleAssessment (moduleId, type, content) VALUES (?, ?, ?)`,
    args: [parseInt(moduleId, 10), type, JSON.stringify(finalJson)]
  });

  return finalJson;
};

/**
 * Generador curricular de contingencia (Offline / Token-safe)
 * Garantiza que el estudiante SIEMPRE pueda evaluarse y avanzar incluso si Gemini agota su cuota de tokens.
 */
export const generateCurricularFallbackAssessment = (moduleData, resources = [], type = 'completa') => {
  const title = (moduleData?.title || '').toLowerCase();
  const desc = (moduleData?.description || '').toLowerCase();
  const combinedText = `${title} ${desc}`;

  const questionPool = [];

  // Redes: Fundamentos, Topologías y Modelos OSI / TCP-IP
  if (combinedText.includes('topolog') || combinedText.includes('osi') || combinedText.includes('tcp/ip') || combinedText.includes('fundamentos y arquitecturas')) {
    questionPool.push(
      {
        id: 1,
        type: 'multiple_choice',
        question: '¿En qué capa del modelo OSI opera el protocolo IP para el direccionamiento y encaminamiento lógico de paquetes?',
        options: ['Capa de Red (Capa 3)', 'Capa de Enlace (Capa 2)', 'Capa de Transporte (Capa 4)', 'Capa de Sesión (Capa 5)'],
        correctAnswer: 'Capa de Red (Capa 3)',
        explanation: 'El protocolo IP opera en la Capa 3 (Red) del modelo OSI, encargándose del direccionamiento lógico y determinación de la mejor ruta.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question: '¿Cuál es la PDU (Unidad de Datos de Protocolo) correspondiente a la capa de transporte en el modelo TCP/IP?',
        options: ['Segmento (o Datagrama)', 'Trama (Frame)', 'Paquete', 'Bit'],
        correctAnswer: 'Segmento (o Datagrama)',
        explanation: 'En la capa de transporte, la PDU se denomina Segmento en TCP y Datagrama en UDP.'
      },
      {
        id: 3,
        type: 'true_false',
        question: 'En una topología en estrella conectada mediante un switch, la desconexión o fallo de un cable de host no interrumpe la comunicación del resto de la red.',
        options: ['Verdadero', 'Falso'],
        correctAnswer: 'Verdadero',
        explanation: 'En la topología en estrella, cada equipo dispone de un enlace dedicado e independiente hacia el switch central, aislando las fallas físicas de cableado.'
      }
    );
  }

  // Redes: Ethernet, MAC, Conmutación
  if (combinedText.includes('ethernet') || combinedText.includes('conmutac') || combinedText.includes('mac') || combinedText.includes('enlace')) {
    questionPool.push(
      {
        id: 4,
        type: 'multiple_choice',
        question: '¿Cuál es la función principal de la tabla CAM (Content Addressable Memory) en un Switch Ethernet?',
        options: [
          'Mapear direcciones MAC con sus respectivos puertos físicos para conmutación eficiente',
          'Almacenar las rutas estáticas hacia otras redes',
          'Asignar direcciones IP automáticas mediante DHCP',
          'Filtrar paquetes maliciosos mediante inspección con estado'
        ],
        correctAnswer: 'Mapear direcciones MAC con sus respectivos puertos físicos para conmutación eficiente',
        explanation: 'El switch aprende dinámicamente las direcciones MAC de origen y las asocia al puerto físico correspondiente en su tabla CAM.'
      },
      {
        id: 5,
        type: 'multiple_choice',
        question: '¿Qué longitud en bits tiene una dirección física MAC de Ethernet estándar?',
        options: ['48 bits (6 bytes)', '32 bits (4 bytes)', '64 bits (8 bytes)', '128 bits (16 bytes)'],
        correctAnswer: '48 bits (6 bytes)',
        explanation: 'Una dirección MAC consta de 48 bits expresados en 12 dígitos hexadecimales. Los primeros 24 bits corresponden al OUI del fabricante.'
      }
    );
  }

  // Redes: IPv4, Subnetting, VLSM
  if (combinedText.includes('ipv4') || combinedText.includes('subnet') || combinedText.includes('vlsm') || combinedText.includes('direccionamiento')) {
    questionPool.push(
      {
        id: 6,
        type: 'multiple_choice',
        question: '¿Cuántas direcciones IP utilizables para hosts proporciona una subred IPv4 con máscara /26 (255.255.255.192)?',
        options: ['62 hosts', '64 hosts', '30 hosts', '126 hosts'],
        correctAnswer: '62 hosts',
        explanation: 'Con /26 quedan 6 bits de host: 2^6 = 64 direcciones totales. Restando la dirección de red y la de broadcast, quedan 62 hosts útiles.'
      },
      {
        id: 7,
        type: 'multiple_choice',
        question: '¿Cuál es el beneficio primordial de implementar VLSM (Variable Length Subnet Masking)?',
        options: [
          'Optimizar el espacio de direccionamiento IP evitando el desperdicio en enlaces punto a punto y subredes pequeñas',
          'Aumentar la velocidad del cableado físico',
          'Eliminar la necesidad de utilizar switches en la red',
          'Cifrar automáticamente las cabeceras de los paquetes'
        ],
        correctAnswer: 'Optimizar el espacio de direccionamiento IP evitando el desperdicio en enlaces punto a punto y subredes pequeñas',
        explanation: 'VLSM permite subdividir un bloque de red utilizando máscaras de longitud variable ajustadas al tamaño exacto de cada segmento.'
      }
    );
  }

  // Redes: Transporte TCP/UDP, Servicios DNS/DHCP/NAT
  if (combinedText.includes('tcp') || combinedText.includes('udp') || combinedText.includes('dns') || combinedText.includes('dhcp') || combinedText.includes('nat') || combinedText.includes('servicios') || combinedText.includes('transporte')) {
    questionPool.push(
      {
        id: 8,
        type: 'multiple_choice',
        question: '¿Cuál es la secuencia de paquetes en el apretón de manos de tres vías (Three-Way Handshake) de TCP?',
        options: ['SYN, SYN-ACK, ACK', 'ACK, SYN, SYN-ACK', 'FIN, ACK, RST', 'HELLO, ACK, READY'],
        correctAnswer: 'SYN, SYN-ACK, ACK',
        explanation: 'El cliente inicia enviando SYN, el servidor responde con SYN-ACK, y finalmente el cliente confirma la conexión con ACK.'
      },
      {
        id: 9,
        type: 'multiple_choice',
        question: '¿Qué mecanismo traduce direcciones IP privadas de una LAN a una dirección IP pública enrutable en Internet?',
        options: ['NAT (Network Address Translation)', 'DHCP', 'DNS', 'ARP'],
        correctAnswer: 'NAT (Network Address Translation)',
        explanation: 'NAT traduce direcciones de origen privadas a públicas para permitir que múltiples terminales naveguen usando una IP pública.'
      }
    );
  }

  // Redes: IPv6, Enrutamiento OSPF, Seguridad
  if (combinedText.includes('ipv6') || combinedText.includes('enrutamiento') || combinedText.includes('routing') || combinedText.includes('ospf') || combinedText.includes('firewall') || combinedText.includes('seguridad') || combinedText.includes('acl')) {
    questionPool.push(
      {
        id: 10,
        type: 'multiple_choice',
        question: '¿Qué protocolo de enrutamiento dinámico IGP de estado de enlace utiliza el algoritmo de Dijkstra (SPF)?',
        options: ['OSPF (Open Shortest Path First)', 'RIP v2', 'BGP', 'EGP'],
        correctAnswer: 'OSPF (Open Shortest Path First)',
        explanation: 'OSPF es un protocolo de estado de enlace que calcula el árbol de menor costo con el algoritmo Shortest Path First (Dijkstra).'
      },
      {
        id: 11,
        type: 'multiple_choice',
        question: '¿Qué tipo de dirección reemplaza el mecanismo de difusión masiva (broadcast) en el protocolo IPv6?',
        options: ['Multicast (y Anycast)', 'Broadcast universal', 'Unicast no enrutable', 'Loopback 127.0.0.1'],
        correctAnswer: 'Multicast (y Anycast)',
        explanation: 'IPv6 eliminó el broadcast tradicional para evitar saturar los enlaces, sustituyéndolo por grupos multicast específicos.'
      }
    );
  }

  // Web: HTTP, HTML, CSS
  if (combinedText.includes('http') || combinedText.includes('cliente-servidor') || combinedText.includes('html') || combinedText.includes('css')) {
    questionPool.push(
      {
        id: 12,
        type: 'multiple_choice',
        question: '¿Qué código de estado HTTP debe devolver una API RESTful al crear exitosamente un nuevo recurso?',
        options: ['201 Created', '200 OK', '204 No Content', '301 Moved Permanently'],
        correctAnswer: '201 Created',
        explanation: 'El código 201 Created indica que la petición se completó con éxito y generó la creación de un nuevo recurso en el servidor.'
      },
      {
        id: 13,
        type: 'multiple_choice',
        question: 'En CSS Flexbox, ¿cuál es la propiedad que alinea los elementos a lo largo del eje transversal (cross axis)?',
        options: ['align-items', 'justify-content', 'flex-direction', 'gap'],
        correctAnswer: 'align-items',
        explanation: 'justify-content alinea los elementos a lo largo del eje principal, mientras que align-items lo hace sobre el eje transversal.'
      }
    );
  }

  // Web: JavaScript, DOM, React
  if (combinedText.includes('javascript') || combinedText.includes('react') || combinedText.includes('dom') || combinedText.includes('componentes') || combinedText.includes('frontend')) {
    questionPool.push(
      {
        id: 14,
        type: 'multiple_choice',
        question: '¿Qué hook básico de React permite declarar y actualizar el estado interno en un componente funcional?',
        options: ['useState', 'useEffect', 'useMemo', 'useContext'],
        correctAnswer: 'useState',
        explanation: 'useState es el hook fundamental de React para declarar variables reactivas que provocan re-renderizados al mutar.'
      },
      {
        id: 15,
        type: 'true_false',
        question: 'En JavaScript moderno, una función declarada con la palabra clave "async" siempre retorna una Promesa.',
        options: ['Verdadero', 'Falso'],
        correctAnswer: 'Verdadero',
        explanation: 'Toda función "async" envuelve implícitamente su valor de retorno en Promise.resolve().'
      }
    );
  }

  // Web: Node.js, Express, REST, JWT
  if (combinedText.includes('node') || combinedText.includes('express') || combinedText.includes('jwt') || combinedText.includes('rest') || combinedText.includes('backend') || combinedText.includes('autenticac')) {
    questionPool.push(
      {
        id: 16,
        type: 'multiple_choice',
        question: 'En una arquitectura Express.js, ¿cuál es el propósito de invocar la función "next()" dentro de un middleware?',
        options: [
          'Pasar el control de la petición al siguiente middleware o controlador en la cadena',
          'Terminar la petición y cerrar la conexión TCP',
          'Reiniciar el proceso del servidor Node.js',
          'Parsear el cuerpo de la petición a formato JSON'
        ],
        correctAnswer: 'Pasar el control de la petición al siguiente middleware o controlador en la cadena',
        explanation: 'Si un middleware no finaliza el ciclo de respuesta, debe invocar next() para continuar el pipeline de middlewares.'
      },
      {
        id: 17,
        type: 'multiple_choice',
        question: '¿Cuáles son las tres partes codificadas en Base64Url que componen la estructura de un JSON Web Token (JWT)?',
        options: [
          'Header, Payload y Signature',
          'Header, Body y Footer',
          'User, Salt y Hash',
          'Token, Secret y Expiration'
        ],
        correctAnswer: 'Header, Payload y Signature',
        explanation: 'Un JWT se compone de tres partes separadas por puntos: Header (algoritmo), Payload (datos/claims) y Signature (firma de integridad).'
      }
    );
  }

  // Preguntas pedagógicas de refuerzo general si el temario no coincidió directamente
  if (questionPool.length < 5) {
    questionPool.push(
      {
        id: 18,
        type: 'multiple_choice',
        question: `Respecto a los objetivos del tema "${moduleData?.title || 'este módulo'}", ¿cuál es la mejor práctica de ingeniería?`,
        options: [
          'Modularizar responsabilidades y validar entradas en cada capa del sistema',
          'Escribir todo el código en un único archivo para evitar dependencias',
          'Desactivar validaciones de seguridad para optimizar velocidad',
          'Omitir pruebas unitarias antes del despliegue a producción'
        ],
        correctAnswer: 'Modularizar responsabilidades y validar entradas en cada capa del sistema',
        explanation: 'La separación de responsabilidades y la validación en todas las capas asegura mantenibilidad, escalabilidad y robustez técnica.'
      },
      {
        id: 19,
        type: 'true_false',
        question: 'El cumplimiento riguroso de prerrequisitos conceptuales reduce la probabilidad de vacíos en temas avanzados.',
        options: ['Verdadero', 'Falso'],
        correctAnswer: 'Verdadero',
        explanation: 'En el modelo de grafos curriculares, dominar los conceptos base desbloquea la asimilación efectiva de temas posteriores.'
      },
      {
        id: 20,
        type: 'multiple_choice',
        question: '¿Qué principio de ingeniería garantiza que los cambios en una dependencia no rompan el resto de módulos?',
        options: ['Bajo acoplamiento y alta cohesión', 'Monolito rígido', 'Herencia múltiple sin interfaces', 'Código espagueti'],
        correctAnswer: 'Bajo acoplamiento y alta cohesión',
        explanation: 'El bajo acoplamiento minimiza las dependencias cruzadas entre componentes, facilitando pruebas, refactorización y evolución del software.'
      }
    );
  }

  // Seleccionar exactamente 5 preguntas bien formateadas
  const selectedQuestions = questionPool.slice(0, 5).map((q, idx) => ({ ...q, id: idx + 1 }));

  // Reto práctico contextual
  const isWeb = combinedText.includes('web') || combinedText.includes('react') || combinedText.includes('node') || combinedText.includes('html') || combinedText.includes('javascript');
  const practicalChallenge = {
    title: `Reto Práctico Aplicado: ${moduleData?.title || 'Laboratorio Técnico'}`,
    context: isWeb
      ? `Desarrolla e implementa la solución de software correspondiente a ${moduleData?.title || 'este módulo'}. Aplica buenas prácticas de modularidad, tipado y manejo de excepciones.`
      : `Diseña y valida la topología o configuración correspondiente a ${moduleData?.title || 'este módulo'}. Documenta los direccionamientos, protocolos y pruebas de conectividad necesarias.`,
    tasks: isWeb
      ? [
          { id: 't1', description: 'Definir la estructura del componente o endpoint con validación rigurosa de entradas.' },
          { id: 't2', description: 'Implementar el manejo asíncrono y control defensivo de estados de error.' },
          { id: 't3', description: 'Verificar la respuesta esperada ejecutando la prueba en consola o entorno interactivo.' }
        ]
      : [
          { id: 't1', description: 'Determinar el esquema de direccionamiento y máscaras según los requerimientos del segmento.' },
          { id: 't2', description: 'Especificar la configuración de interfaces y protocolos de enlace o transporte.' },
          { id: 't3', description: 'Verificar la convergencia y validar el flujo de tráfico punto a punto.' }
        ]
  };

  if (type === 'teoria') {
    return { questions: selectedQuestions };
  } else if (type === 'practica') {
    return { practicalChallenge };
  } else {
    return {
      questions: selectedQuestions,
      practicalChallenge
    };
  }
};
