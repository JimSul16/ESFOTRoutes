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

    console.log('✅ Migración completada: todas las tablas y columnas existen en Turso.');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  }
};
