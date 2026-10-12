import { GoogleGenerativeAI } from '@google/generative-ai';
import { turso } from '../config/turso.js';
import { prepareResourceForGemini } from './resourceParser.service.js';
import { getDriver } from './neo4j.service.js';
import { getTopicContextForChat, markTopicStruggle } from './knowledgeGraph.service.js';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const result = await model.generateContent(analysisPrompt);
    const updatedProfile = result.response.text().trim();

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
export const generateChatResponse = async ({ userId, moduleId, topicId, message, sessionId, user }) => {
  // 1. Obtener o crear sesión
  let session;
  if (sessionId) {
    const sResult = await turso.execute({
      sql: `SELECT * FROM ChatSession WHERE id = ? AND userId = ?`,
      args: [parseInt(sessionId), userId]
    });
    session = sResult.rows[0];
  }

  if (!session) {
    await turso.execute({
      sql: `INSERT INTO ChatSession (userId, moduleId, title) VALUES (?, ?, 'Sesión de Tutoría IA')`,
      args: [userId, moduleId ? parseInt(moduleId) : null]
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
  if (moduleId) {
    const modResult = await turso.execute({
      sql: `SELECT m.*, lr.evaluationRules FROM Module m
            JOIN LearningRoute lr ON lr.id = m.routeId
            WHERE m.id = ?`,
      args: [parseInt(moduleId)]
    });

    if (modResult.rows.length) {
      const moduleData = modResult.rows[0];
      moduleContext = `Módulo: ${moduleData.title}\nDescripción: ${moduleData.description}\nReglas de Evaluación: ${moduleData.evaluationRules || 'Ninguna'}\n\nContenido del material de estudio:\n`;

      const resourcesResult = await turso.execute({
        sql: `SELECT r.* FROM Resource r JOIN ModuleResource mr ON mr.resourceId = r.id WHERE mr.moduleId = ?`,
        args: [parseInt(moduleId)]
      });

      const parsedResources = await Promise.all(resourcesResult.rows.map(r => prepareResourceForGemini(r)));
      let combined = parsedResources.join('\n');
      if (combined.length > 150000) combined = combined.substring(0, 150000) + '\n\n[Contenido truncado]';
      moduleContext += combined;
    }
  }

  // 4. GraphRAG: Subgrafo específico del tema si se proporciona topicId, o subgrafo global
  let graphContext = '';
  if (topicId) {
    const topicGraph = await getTopicContextForChat(topicId);
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
    }
  } else {
    // Si no hay topicId, extraer resumen del grafo global
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

  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: systemPrompt });

  // 6. Cargar Historial
  const historyResult = await turso.execute({
    sql: `SELECT * FROM ChatMessage WHERE sessionId = ? ORDER BY createdAt ASC`,
    args: [session.id]
  });

  const history = historyResult.rows.slice(0, -1).map(msg => ({
    role: msg.sender === 'STUDENT' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(message);
  const aiResponseText = result.response.text();

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
  if (topicId && struggleKeywords.some(kw => lowerMsg.includes(kw))) {
    markTopicStruggle(userId, topicId, 'Estudiante reportó dificultad o confusión directa en chat.');
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
    args: [parseInt(moduleId), type]
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
    args: [parseInt(moduleId)]
  });

  if (!modResult.rows.length) {
    throw new Error('Módulo no encontrado.');
  }

  const moduleData = modResult.rows[0];
  const resourcesResult = await turso.execute({
    sql: `SELECT r.* FROM Resource r JOIN ModuleResource mr ON mr.resourceId = r.id WHERE mr.moduleId = ?`,
    args: [parseInt(moduleId)]
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

  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: systemPrompt });
  const chat = model.startChat();
  const result = await chat.sendMessage('Genera la evaluación ahora. Responde SOLO con el JSON puro.');
  let aiResponseText = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();

  const finalJson = JSON.parse(aiResponseText);
  await turso.execute({
    sql: `INSERT INTO ModuleAssessment (moduleId, type, content) VALUES (?, ?, ?)`,
    args: [parseInt(moduleId), type, JSON.stringify(finalJson)]
  });

  return finalJson;
};
