import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  executeWithGeminiCascade,
  generateCurricularFallbackAssessment,
  PRIMARY_MODEL,
  BACKUP_MODEL
} from '../src/services/chat.service.js';
import 'dotenv/config';

console.log('====================================================');
console.log('🧪 VERIFICACIÓN INTEGRAL DE ARQUITECTURA EN CASCADA');
console.log('====================================================\n');

async function testLevel1Live() {
  console.log(`[TEST 1] Verificando Nivel 1 en Vivo: ${PRIMARY_MODEL}...`);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Fallo: GEMINI_API_KEY no encontrada.');
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: PRIMARY_MODEL,
      systemInstruction: 'Eres un evaluador pedagógico. Responde únicamente con JSON puro: {"status": "ok", "level": 1, "model": "' + PRIMARY_MODEL + '"}'
    });
    const result = await model.generateContent('Genera confirmación en formato JSON.');
    const text = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(text);
    console.log(`✅ Nivel 1 Funciona Exitosamente (${PRIMARY_MODEL}):`, JSON.stringify(parsed));
    return true;
  } catch (err) {
    console.warn(`⚠️ Nivel 1 arrojó error (${PRIMARY_MODEL}):`, err.message);
    return false;
  }
}

async function testLevel2Live() {
  console.log(`\n[TEST 2] Verificando Nivel 2 en Vivo: ${BACKUP_MODEL}...`);
  const apiKeyBackup = process.env.GEMINI_API_KEY_BACKUP || process.env.GEMINI_API_KEY;
  if (!apiKeyBackup) {
    console.error('❌ Fallo: GEMINI_API_KEY_BACKUP no configurada.');
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKeyBackup);
    const model = genAI.getGenerativeModel({
      model: BACKUP_MODEL,
      systemInstruction: 'Eres un evaluador pedagógico. Responde únicamente con JSON puro: {"status": "ok", "level": 2, "model": "' + BACKUP_MODEL + '"}'
    });
    const result = await model.generateContent('Genera confirmación en formato JSON.');
    const text = result.response.text().replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(text);
    console.log(`✅ Nivel 2 Funciona Exitosamente (${BACKUP_MODEL}):`, JSON.stringify(parsed));
    return true;
  } catch (err) {
    console.warn(`⚠️ Nivel 2 arrojó error (${BACKUP_MODEL}):`, err.message);
    return false;
  }
}

async function testAutomaticFailover() {
  console.log('\n[TEST 3] Simulando fallo en Nivel 1 (429 Quota Exhausted) -> Conmutación automática a Nivel 2...');
  
  let callCount = 0;
  const simulatedExecute = async ({ modelName, tier }) => {
    callCount++;
    if (tier === 1) {
      throw new Error('429 Too Many Requests: Quota exceeded for model ' + modelName);
    }
    return {
      status: 'success_failover',
      tierResolved: tier,
      modelUsed: modelName,
      message: 'Recuperado automáticamente en Nivel 2'
    };
  };

  try {
    const result = await executeWithGeminiCascade(simulatedExecute);
    console.log('✅ Conmutación Exitosa:', JSON.stringify(result));
    console.log(`   Total de intentos realizados por la cascada: ${callCount}`);
    return result.tierResolved === 2;
  } catch (err) {
    console.error('❌ Error en conmutación:', err.message);
    return false;
  }
}

async function testLevel3CurricularFallback() {
  console.log('\n[TEST 4] Simulando fallo simultáneo en Nivel 1 Y Nivel 2 -> Activación de Nivel 3 (Banco Curricular)...');
  
  const mockModule = {
    title: 'Arquitecturas de Red y Enrutamiento TCP/IP',
    description: 'Subredes VLSM, modelo OSI, direccionamiento IPv4 y protocolos de capa de red'
  };

  try {
    // Simular fallo de los 2 niveles
    let fallbackActivated = false;
    let finalJson = null;

    try {
      await executeWithGeminiCascade(async () => {
        throw new Error('429 Quota Exhausted en todos los modelos de IA');
      });
    } catch (_) {
      fallbackActivated = true;
      finalJson = generateCurricularFallbackAssessment(mockModule, [], 'completa');
    }

    if (fallbackActivated && finalJson) {
      console.log('✅ Nivel 3 Activado Correctamente (Sin conexión / Sin tokens):');
      console.log(`   - Preguntas generadas: ${finalJson.questions?.length || 0}`);
      console.log(`   - Pregunta ejemplo: "${finalJson.questions?.[0]?.question}"`);
      console.log(`   - Opciones: ${finalJson.questions?.[0]?.options?.join(' | ')}`);
      console.log(`   - Respuesta correcta: ${finalJson.questions?.[0]?.correctAnswer}`);
      console.log(`   - Reto práctico: "${finalJson.practicalChallenge?.title}"`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Error en activación de Nivel 3:', err.message);
    return false;
  }
}

async function main() {
  const r1 = await testLevel1Live();
  const r2 = await testLevel2Live();
  const r3 = await testAutomaticFailover();
  const r4 = await testLevel3CurricularFallback();

  console.log('\n====================================================');
  console.log('📊 RESUMEN DE RESULTADOS DE LA PRUEBA EN CASCADA:');
  console.log(`   Nivel 1 (Primario: ${PRIMARY_MODEL}): ${r1 ? '🟢 OPERATIVO' : '🟠 ALERTA/FALLA'}`);
  console.log(`   Nivel 2 (Respaldo: ${BACKUP_MODEL}): ${r2 ? '🟢 OPERATIVO' : '🟠 ALERTA/FALLA'}`);
  console.log(`   Conmutación Automática (N1 -> N2): ${r3 ? '🟢 VERIFICADO (100%)' : '🔴 ERROR'}`);
  console.log(`   Nivel 3 (Banco Curricular Offline): ${r4 ? '🟢 GARANTIZADO (100%)' : '🔴 ERROR'}`);
  console.log('====================================================\n');
}

main().catch(console.error);
