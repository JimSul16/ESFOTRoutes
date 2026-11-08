import { turso } from '../config/turso.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Lee schema.sql y ejecuta cada sentencia CREATE TABLE en Turso.
 * Elimina comentarios antes de parsear para evitar errores de splitting.
 */
export const runMigrations = async () => {
  try {
    let sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

    // 1. Eliminar comentarios de línea (-- ...)
    sql = sql.replace(/--[^\n]*/g, '');

    // 2. Separar por ';' y limpiar espacios en blanco
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await turso.execute(stmt + ';');
    }

    // Asegurar columnas nuevas en la tabla User si ya fue creada previamente
    const userColumns = [
      { name: 'failedAttempts', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'lockoutUntil',   type: 'TEXT' },
      { name: 'lockoutCount',   type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'isLocked',       type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'unlockToken',    type: 'TEXT' },
    ];

    const tableInfo = await turso.execute('PRAGMA table_info(User)');
    const existingCols = tableInfo.rows.map(r => r.name);

    for (const col of userColumns) {
      if (!existingCols.includes(col.name)) {
        await turso.execute(`ALTER TABLE User ADD COLUMN ${col.name} ${col.type}`);
        console.log(`➕ Columna de seguridad agregada a User: ${col.name}`);
      }
    }

    // ── LearningRoute.subjectId ───────────────────────────────────────────
    // Permite relacionar una ruta con la materia del grafo de conocimiento
    // ('redes' | 'web'). Antes solo vivía dentro del JSON de evaluationRules,
    // así que el frontend no podía filtrar rutas por materia.
    const routeInfo = await turso.execute('PRAGMA table_info(LearningRoute)');
    const routeColumns = routeInfo.rows.map(r => r.name);

    if (!routeColumns.includes('subjectId')) {
      await turso.execute('ALTER TABLE LearningRoute ADD COLUMN subjectId TEXT');
      console.log('➕ Columna subjectId agregada a LearningRoute');
    }

    // Backfill: las rutas adaptativas ya guardaban el subjectId dentro del
    // JSON de evaluationRules, y las manuales lo deducen de `category`.
    await turso.execute(`
      UPDATE LearningRoute
      SET subjectId = json_extract(evaluationRules, '$.subjectId')
      WHERE subjectId IS NULL
        AND evaluationRules IS NOT NULL
        AND json_valid(evaluationRules)
        AND json_extract(evaluationRules, '$.subjectId') IS NOT NULL
    `);

    await turso.execute(`
      UPDATE LearningRoute SET subjectId = 'redes'
      WHERE subjectId IS NULL AND category = 'Redes de Computadoras'
    `);

    await turso.execute(`
      UPDATE LearningRoute SET subjectId = 'web'
      WHERE subjectId IS NULL AND category = 'Desarrollo de Aplicaciones Web'
    `);

    // ── LearningRoute.difficulty CHECK constraint ('ADAPTIVE') ─────────────
    // Garantiza que la tabla acepte 'ADAPTIVE' para rutas generadas por el grafo.
    const tableDefResult = await turso.execute(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'LearningRoute'"
    );
    const tableSql = tableDefResult.rows[0]?.sql || '';

    if (!tableSql.includes("'ADAPTIVE'")) {
      console.log("🔄 Actualizando restricción CHECK de LearningRoute para admitir 'ADAPTIVE'...");
      await turso.execute("PRAGMA foreign_keys = OFF;");
      await turso.execute(`
        CREATE TABLE IF NOT EXISTS LearningRoute_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          title           TEXT    NOT NULL,
          description     TEXT,
          category        TEXT,
          subjectId       TEXT,
          imageUrl        TEXT,
          estimatedTime   INTEGER,
          difficulty      TEXT    NOT NULL DEFAULT 'BEGINNER' CHECK(difficulty IN ('BEGINNER','INTERMEDIATE','ADVANCED','ADAPTIVE')),
          evaluationRules TEXT,
          isPublic        INTEGER NOT NULL DEFAULT 1,
          authorId        INTEGER NOT NULL,
          createdAt       TEXT    NOT NULL DEFAULT (datetime('now')),
          updatedAt       TEXT    NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (authorId) REFERENCES User(id)
        );
      `);
      await turso.execute(`
        INSERT INTO LearningRoute_new (id, title, description, category, subjectId, imageUrl, estimatedTime, difficulty, evaluationRules, isPublic, authorId, createdAt, updatedAt)
        SELECT id, title, description, category, subjectId, imageUrl, estimatedTime, difficulty, evaluationRules, isPublic, authorId, createdAt, updatedAt
        FROM LearningRoute;
      `);
      await turso.execute("DROP TABLE LearningRoute;");
      await turso.execute("ALTER TABLE LearningRoute_new RENAME TO LearningRoute;");
      await turso.execute("PRAGMA foreign_keys = ON;");
      console.log("✅ Restricción CHECK de LearningRoute actualizada exitosamente a ('BEGINNER','INTERMEDIATE','ADVANCED','ADAPTIVE').");
    }

    console.log('✅ Migración completada: todas las tablas y columnas existen en Turso.');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  }
};
