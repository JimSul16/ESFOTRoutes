/**
 * Limpieza de cuentas de prueba creadas durante las pruebas de integración
 * (NO toca cuentas reales: solo los patrones de prueba).
 *
 * Uso: node scripts/db-limpieza.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envRaw = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const pick = (k) => {
  const a = envRaw.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
  const c = envRaw.match(new RegExp(`^#\\s*${k}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
  const ok = (v) => v && /^(libsql|https?):\/\//.test(v);
  return ok(a) ? a : ok(c) ? c : a || c || '';
};
const db = createClient({ url: pick('TURSO_DATABASE_URL'), authToken: pick('TURSO_AUTH_TOKEN') });
const dry = process.argv.includes('--dry-run');

const PATRONES = [
  'prueba.flujo.%',
  'prueba.e2e.%',
  'prueba.local.%',
  'prueba.correos.%',
  'sonda.ok.%',
  'sonda.dupe.%',
  'sonda.hotmail.%',
];

const encontrados = await db.execute({
  sql: `SELECT id, email, isVerified FROM User
        WHERE ${PATRONES.map(() => 'email LIKE ?').join(' OR ')}`,
  args: PATRONES,
});

console.log('── Cuentas de prueba detectadas ───────────────────');
console.table(encontrados.rows);

if (!encontrados.rows.length) {
  console.log('✔ Nada que limpiar.');
  process.exit(0);
}

if (dry) {
  console.log('(dry-run: no se borró nada)');
  process.exit(0);
}

for (const fila of encontrados.rows) {
  for (const tabla of ['UserRole', 'Enrollment', 'ChatSession', 'ModuleProgress', 'UserSessionLog', 'LearningRoute']) {
    try { await db.execute({ sql: `DELETE FROM ${tabla} WHERE userId = ?`, args: [fila.id] }); } catch { /* tabla opcional */ }
  }
  await db.execute({ sql: 'DELETE FROM User WHERE id = ?', args: [fila.id] });
  console.log(`✔ eliminada: ${fila.email} (id ${fila.id})`);
}

const total = (await db.execute('SELECT COUNT(*) c FROM User')).rows[0].c;
console.log(`\nUsuarios restantes en la BD: ${total}`);
