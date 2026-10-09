import { GoogleGenerativeAI } from '@google/generative-ai';
import { turso } from '../config/turso.js';
import { prepareResourceForGemini } from '../services/resourceParser.service.js';
import { getDriver } from '../services/neo4j.service.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Helper: actualizar perfil de aprendizaje del estudiante ─────────────────
const updateStudentProfile = async (userId, studentMessage, aiMessage, currentProfile) => {
  try {
    const analysisPrompt = `
      Analiza la siguiente interacción entre un estudiante y un tutor de la Escuela Politécnica Nacional.
      Mensaje del estudiante: "${studentMessage}"
      Respuesta del tutor: "${aiMessage}"
      Perfil de aprendizaje actual del estudiante: "${currentProfile || 'No definido aún.'}"
      
      Actualiza el perfil de aprendizaje sintetizando su nivel de comprensión, dudas recurrentes y estilo preferido.
      Devuelve ÚNICAMENTE el texto actualizado del perfil de forma concisa.
    `;

    const model  = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const result = await model.generateContent(analysisPrompt);
    const updatedProfile = result.response.text().trim();

    await turso.execute({
      sql: `UPDATE User SET learningProfile = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [updatedProfile, userId]
    });
  } catch (_) {}
};

// ─── Controladores ────────────────────────────────────────────────────────────

export const processChatMessage = async (req, res) => {
  try {
    const { moduleId, message, sessionId } = req.body;
    const userId = req.user.id;

    const userResult = await turso.execute({ sql: `SELECT * FROM User WHERE id = ?`, args: [userId] });
    const user       = userResult.rows[0];

    let session;
    if (sessionId) {
      const sResult = await turso.execute({ sql: `SELECT * FROM ChatSession WHERE id = ? AND userId = ?`, args: [parseInt(sessionId), userId] });
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

    // Guardar mensaje del estudiante
    await turso.execute({
      sql: `INSERT INTO ChatMessage (sessionId, sender, content) VALUES (?, 'STUDENT', ?)`,
      args: [session.id, message]
    });

    // Contexto del módulo
    let contextText = 'Consulta general del estudiante.';
    if (moduleId) {
      const modResult = await turso.execute({
        sql: `SELECT m.*, lr.evaluationRules FROM Module m
              JOIN LearningRoute lr ON lr.id = m.routeId
              WHERE m.id = ?`,
        args: [parseInt(moduleId)]
      });

      if (modResult.rows.length) {
        const moduleData = modResult.rows[0];
        contextText = `Módulo: ${moduleData.title}\nDescripción: ${moduleData.description}\nReglas de Evaluación: ${moduleData.evaluationRules || 'Ninguna'}\n\nContenido del material de estudio:\n`;

        const resourcesResult = await turso.execute({
          sql: `SELECT r.* FROM Resource r JOIN ModuleResource mr ON mr.resourceId = r.id WHERE mr.moduleId = ?`,
          args: [parseInt(moduleId)]
        });

        const parsedResources = await Promise.all(resourcesResult.rows.map(r => prepareResourceForGemini(r)));
        let combined = parsedResources.join('\n');
        if (combined.length > 150000) combined = combined.substring(0, 150000) + '\n\n[Contenido truncado]';
        contextText += combined;
      }
    }

    // Integración GraphRAG: Consultar Neo4j para obtener un contexto global de rutas y módulos
    let graphContext = '';
    try {
      const driver = getDriver();
      if (driver) {
        const neo4jSession = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
        const graphRes = await neo4jSession.run(
          `MATCH (r:LearningRoute)-[:CONTAINS]->(m:Module)
           RETURN r.title AS route, collect(m.title) AS modules
           LIMIT 10`
        );
        const routesInfo = graphRes.records.map(rec => `- Ruta: ${rec.get('route')}. Módulos: ${rec.get('modules').join(', ')}`).join('\n');
        if (routesInfo) {
          graphContext = `\nContexto global del plan de estudios (Extraído del Grafo de Conocimiento Neo4j):\n${routesInfo}\n`;
        }
        await neo4jSession.close();
      }
    } catch(err) {
      console.error("Error obteniendo GraphContext de Neo4j:", err);
    }

    const systemPrompt = `
      Eres un profesor titular de la Escuela Politécnica Nacional (EPN), específicamente de la ESFOT.
      Tu objetivo es evaluar y guiar al estudiante basándote ESTRICTAMENTE en este material:

      ${contextText}
      ${graphContext}

      Contexto de aprendizaje dinámico de este estudiante:
      ${user.learningProfile || 'Estudiante nuevo, adapta tu estilo progresivamente.'}

      Reglas de Evaluación:
      1. Adapta tus explicaciones al contexto de aprendizaje dinámico proporcionado.
      2. Prohibido hacer preguntas de definiciones memorísticas o conceptos básicos.
      3. Plantea escenarios prácticos orientados a la resolución de problemas lógicos.
      4. Exige el análisis de código, arquitecturas de software, rendimiento o configuraciones de red.
      5. Mantén un tono académico, riguroso y directo.
      6. Si el estudiante pregunta sobre rutas de aprendizaje disponibles o módulos, utiliza la información del "Contexto global del plan de estudios".
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: systemPrompt });

    // Historial de la sesión
    const historyResult = await turso.execute({
      sql: `SELECT * FROM ChatMessage WHERE sessionId = ? ORDER BY createdAt ASC`,
      args: [session.id]
    });

    const history = historyResult.rows.slice(0, -1).map(msg => ({
      role: msg.sender === 'STUDENT' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat           = model.startChat({ history });
    const result         = await chat.sendMessage(message);
    const aiResponseText = result.response.text();

    await turso.execute({
      sql: `INSERT INTO ChatMessage (sessionId, sender, content) VALUES (?, 'AI', ?)`,
      args: [session.id, aiResponseText]
    });

    const aiMsgResult = await turso.execute({
      sql: `SELECT * FROM ChatMessage WHERE sessionId = ? ORDER BY id DESC LIMIT 1`,
      args: [session.id]
    });

    updateStudentProfile(userId, message, aiResponseText, user.learningProfile);

    return res.status(200).json({ sessionId: session.id, reply: aiMsgResult.rows[0] });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ error: 'Límite de peticiones de IA alcanzado.' });
    console.error('Error en processChatMessage:', error);
    return res.status(500).json({ error: 'Error interno al procesar el mensaje.' });
  }
};

export const generateModuleAssessment = async (req, res) => {
  try {
    const { moduleId, type = 'completa' } = req.body;

    const existingAssessmentRes = await turso.execute({
      sql: `SELECT content FROM ModuleAssessment WHERE moduleId = ? AND type = ? ORDER BY createdAt DESC LIMIT 1`,
      args: [parseInt(moduleId), type]
    });

    if (existingAssessmentRes.rows.length > 0) {
      try {
        const parsedContent = JSON.parse(existingAssessmentRes.rows[0].content);
        return res.status(200).json(parsedContent);
      } catch (e) {
        console.error('Error parseando evaluación guardada:', e);
      }
    }

    const modResult = await turso.execute({
      sql: `SELECT m.*, lr.evaluationRules FROM Module m
            JOIN LearningRoute lr ON lr.id = m.routeId
            WHERE m.id = ?`,
      args: [parseInt(moduleId)]
    });

    if (!modResult.rows.length) return res.status(404).json({ error: 'Módulo no encontrado.' });

    const moduleData    = modResult.rows[0];
    const resourcesResult = await turso.execute({
      sql: `SELECT r.* FROM Resource r JOIN ModuleResource mr ON mr.resourceId = r.id WHERE mr.moduleId = ?`,
      args: [parseInt(moduleId)]
    });

    let contextText = `Módulo: ${moduleData.title}\nReglas de Evaluación (Prompt Maestro): ${moduleData.evaluationRules || 'Ninguna'}\n\nContenido de los recursos:\n`;
    const parsedResources = await Promise.all(resourcesResult.rows.map(r => prepareResourceForGemini(r)));
    let combined = parsedResources.join('\n');
    if (combined.length > 150000) combined = combined.substring(0, 150000) + '\n\n[Contenido truncado]';
    contextText += combined;

    const practicalRules = `
      IMPORTANTE: El editor es un lienzo multitarea. Indica al estudiante que seleccione "Markdown / Texto Libre" para redactar su respuesta con bloques de código o que suba imágenes.
    `;

    let promptInstructions = '';
    let fewShotExample     = '';

    if (type === 'teoria') {
      promptInstructions = 'Genera EXACTAMENTE 5 preguntas de tipo "multiple_choice" o "true_false".';
      fewShotExample     = '{"questions": [{"id": 1, "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "..."}]}';
    } else if (type === 'practica') {
      promptInstructions = `Genera UN "practicalChallenge" SENCILLO con UNA SOLA tarea.\n${practicalRules}`;
      fewShotExample     = '{"practicalChallenge": {"title": "...", "context": "...", "tasks": [{"id": "t1", "description": "..."}]}}';
    } else {
      promptInstructions = `Genera ENTRE 10 Y 15 PREGUNTAS y un "practicalChallenge" integrador con 3-5 tareas.\n${practicalRules}`;
      fewShotExample     = '{"questions": [...], "practicalChallenge": {"title": "...", "context": "...", "tasks": [...]}}';
    }

    const systemPrompt = `
      Eres un profesor exigente de la EPN. Crea material de evaluación EXCLUSIVAMENTE basado en este material:
      ${contextText}
      ${promptInstructions}
      Devuelve ÚNICAMENTE JSON puro. EJEMPLO: ${fewShotExample}
    `;

    const model  = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: systemPrompt });
    const chat   = model.startChat();
    const result = await chat.sendMessage('Genera la evaluación ahora. Responde SOLO con el JSON puro.');
    let aiResponseText = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();

    try {
      const finalJson = JSON.parse(aiResponseText);
      await turso.execute({
        sql: `INSERT INTO ModuleAssessment (moduleId, type, content) VALUES (?, ?, ?)`,
        args: [parseInt(moduleId), type, JSON.stringify(finalJson)]
      });
      return res.status(200).json(finalJson);
    } catch {
      return res.status(500).json({ error: 'La IA devolvió un formato inválido. Intenta de nuevo.' });
    }
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ error: 'Límite de peticiones de IA alcanzado.' });
    return res.status(500).json({ error: 'Error al generar la prueba dinámica.' });
  }
};
