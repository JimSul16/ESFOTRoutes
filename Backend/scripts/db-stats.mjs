/**
 * Diagnóstico agregado de la BD de producción (Turso).
 * Uso: node scripts/db-stats.mjs
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
  const red = (v) => v && /^(libsql|https?):\/\//.test(v);
  return red(a) ? a : red(c) ? c : a || c || '';
};
const db = createClient({ url: pick('TURSO_DATABASE_URL'), authToken: pick('TURSO_AUTH_TOKEN') });

const one = async (sql, args = []) => (await db.execute({ sql, args })).rows[0];

console.log('\n── Usuarios ─────────────────────────────────────');
console.table([{
  total: (await one(`SELECT COUNT(*) c FROM User`)).c,
  sin_carrera: (await one(`SELECT COUNT(*) c FROM User WHERE career IS NULL OR career = ''`)).c,
  sin_semestre: (await one(`SELECT COUNT(*) c FROM User WHERE semester IS NULL`)).c,
  sin_uniqueId: (await one(`SELECT COUNT(*) c FROM User WHERE uniqueId IS NULL OR uniqueId = ''`)).c,
  sin_verificar: (await one(`SELECT COUNT(*) c FROM User WHERE isVerified = 0`)).c,
  bloqueados: (await one(`SELECT COUNT(*) c FROM User WHERE isLocked = 1`)).c,
}]);

console.log('── Últimos 12 registros ─────────────────────────');
const recent = await db.execute(`SELECT id, email, career, semester, uniqueId, isVerified, isActive, createdAt
                                  FROM User ORDER BY id DESC LIMIT 12`);
console.table(recent.rows);

console.log('── Sin verificar (no pueden entrar) ─────────────');
const noVerif = await db.execute(`SELECT id, email, createdAt FROM User WHERE isVerified = 0 ORDER BY id DESC LIMIT 15`);
console.table(noVerif.rows);
