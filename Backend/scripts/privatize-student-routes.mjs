/**
 * Vuelve privadas (`isPublic = 0`) las rutas personales que quedaron
 * publicadas por error: rutas adaptativas del autodiagnóstico (se guardaban
 * con `isPublic = 1`), rutas generadas por IA y cualquier ruta cuyo autor no
 * sea ADMIN.
 *
 * Por defecto es una SIMULACIÓN: lista lo que cambiaría y cuántos alumnos
 * distintos del autor están inscritos. Esas inscripciones se conservan y la
 * política de acceso (`routeAccess.service.js`) les sigue permitiendo leer
 * la ruta.
 *
 * Uso: node scripts/privatize-student-routes.mjs [--apply]
 * BD: la de `TURSO_DATABASE_URL` (variable de entorno o `.env`).
 */
import { turso } from '../src/config/turso.js';

const apply = process.argv.includes('--apply');

// Las rutas adaptativas siempre guardan `generatedVia` en `evaluationRules`
// (graphAlgorithm.js), sea cual sea la dificultad (BEGINNER/ADAPTIVE/ADVANCED).
// Los roles viven en UserRole/Role: `User` no tiene columna `roles`.
const PREDICATE = `
  lr.isPublic = 1
  AND (
       lr.category = 'Generada por IA'
    OR lr.evaluationRules LIKE '%"generatedVia":"KnowledgeGraphDAG"%'
    OR NOT EXISTS (SELECT 1 FROM UserRole ur JOIN Role r ON r.id = ur.roleId
                    WHERE ur.userId = lr.authorId AND r.name = 'ADMIN')
  )`;

const candidates = await turso.execute(`
  SELECT lr.id, lr.title, lr.difficulty, lr.category, lr.authorId,
         (SELECT COUNT(*) FROM Enrollment e
           WHERE e.learningRouteId = lr.id AND e.userId <> lr.authorId) AS foreignEnrollments
  FROM LearningRoute lr
  WHERE ${PREDICATE}
  ORDER BY lr.id`);

console.log(`── Rutas a privatizar: ${candidates.rows.length} ─────────────────────`);
if (candidates.rows.length) console.table(candidates.rows);

const foreign = candidates.rows.reduce((n, r) => n + Number(r.foreignEnrollments || 0), 0);
if (foreign) {
  console.log(`ℹ️  ${foreign} inscripciones de otros alumnos se conservan (siguen con acceso).`);
}

if (!apply) {
  console.log('Simulación: no se cambió nada. Ejecuta con --apply para aplicar.');
} else if (candidates.rows.length) {
  const result = await turso.execute(`
    UPDATE LearningRoute SET isPublic = 0, updatedAt = datetime('now')
    WHERE id IN (SELECT lr.id FROM LearningRoute lr WHERE ${PREDICATE})`);
  console.log(`✅ ${result.rowsAffected} rutas privatizadas.`);
}

turso.close();
