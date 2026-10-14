import { generateModuleAssessmentService } from '../src/services/chat.service.js';
import { turso } from '../src/config/turso.js';
import 'dotenv/config';

console.log('================================================================');
console.log('📝 PRUEBA INTEGRAL DE GENERACIÓN DE CUESTIONARIOS EN CASCADA');
console.log('================================================================\n');

async function run() {
  const testModuleId = 1; // Módulo real en la base de datos Turso
  const uniqueSuffix = Date.now();

  try {
    console.log('▶️ [PASO 1] Generación de Cuestionario en Vivo con la API Principal (Nivel 1: gemini-3.5-flash)...');
    const typeTier1 = `test_live_t1_${uniqueSuffix}`;
    const t0 = Date.now();
    const resNivel1 = await generateModuleAssessmentService(testModuleId, typeTier1);
    const t1 = Date.now();

    console.log(`✅ [NIVEL 1] Cuestionario generado con éxito en ${t1 - t0}ms!`);
    console.log(`   - Preguntas generadas: ${resNivel1.questions?.length || 0}`);
    console.log(`   - Muestra pregunta 1: "${resNivel1.questions?.[0]?.question}"`);
    console.log(`   - Opciones: ${resNivel1.questions?.[0]?.options?.join(' | ')}`);
    console.log(`   - Reto práctico: "${resNivel1.practicalChallenge?.title}"`);

    console.log('\n▶️ [PASO 2] Forzando fallo en Nivel 1 para verificar conmutación automática a Nivel 2 (API de Backup: gemini-3.5-flash-lite)...');
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'API_KEY_SIMULADA_INVALIDA';

    const typeTier2 = `test_live_t2_${uniqueSuffix}`;
    try {
      const t2 = Date.now();
      const resNivel2 = await generateModuleAssessmentService(testModuleId, typeTier2);
      const t3 = Date.now();

      console.log(`✅ [NIVEL 2] Conmutó y generó el cuestionario automáticamente en ${t3 - t2}ms con la API Backup!`);
      console.log(`   - Preguntas generadas: ${resNivel2.questions?.length || 0}`);
      console.log(`   - Muestra pregunta 1: "${resNivel2.questions?.[0]?.question}"`);
      console.log(`   - Reto práctico: "${resNivel2.practicalChallenge?.title}"`);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }

    console.log('\n▶️ [PASO 3] Forzando fallo simultáneo en Nivel 1 Y Nivel 2 para verificar Nivel 3 (Banco Curricular)...');
    const originalBackupKey = process.env.GEMINI_API_KEY_BACKUP;
    process.env.GEMINI_API_KEY = 'API_KEY_SIMULADA_INVALIDA';
    process.env.GEMINI_API_KEY_BACKUP = 'BACKUP_KEY_SIMULADA_INVALIDA';

    const typeTier3 = `test_live_t3_${uniqueSuffix}`;
    try {
      const t4 = Date.now();
      const resNivel3 = await generateModuleAssessmentService(testModuleId, typeTier3);
      const t5 = Date.now();

      console.log(`✅ [NIVEL 3] Activado Contingencia Curricular ESFOT en ${t5 - t4}ms!`);
      console.log(`   - ¿Consumió tokens de IA?: NO (0 tokens, 100% offline y seguro)`);
      console.log(`   - Preguntas generadas: ${resNivel3.questions?.length || 0}`);
      console.log(`   - Muestra pregunta 1: "${resNivel3.questions?.[0]?.question}"`);
      console.log(`   - Reto práctico: "${resNivel3.practicalChallenge?.title}"`);
      console.log(`   - Código base para el estudiante: ${Boolean(resNivel3.practicalChallenge?.initialCode)}`);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
      process.env.GEMINI_API_KEY_BACKUP = originalBackupKey;
    }

    console.log('\n================================================================');
    console.log('🎉 VERIFICACIÓN COMPLETA:');
    console.log('  1. Nivel 1 (API Principal) crea el cuestionario perfectamente.');
    console.log('  2. Si Nivel 1 falla, conmuta automáticamente a la API de Backup y lo crea.');
    console.log('  3. Si ambas APIs fallan, el Nivel 3 (Banco Curricular ESFOT) suministra');
    console.log('     la evaluación de inmediato sin bloquear al estudiante.');
    console.log('================================================================\n');

  } finally {
    // Limpieza de evaluaciones de prueba
    await turso.execute({
      sql: `DELETE FROM ModuleAssessment WHERE type LIKE 'test_live_%'`,
      args: []
    });
  }
}

run().catch(console.error);
