/**
 * Sondas diagnósticas sobre la BD de producción:
 *  - dominios de correo de los usuarios (¿hay dominios que el registro rechaza?)
 *  - uniqueIds duplicados / '123456789' (¿el registro devolvería 409?)
 * Uso: node scripts/db-sondas.mjs
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

console.log('── Dominios de correo ────────────────────────────');
const dominios = await db.execute(
  `SELECT substr(email, instr(email, '@') + 1) AS dom, COUNT(*) AS n FROM User GROUP BY dom ORDER BY n DESC`
);
console.table(dominios.rows);

console.log('── Dominios que el registro NO acepta (@epn.edu.ec / @gmail.com) ──');
const rechazados = await db.execute(
  `SELECT id, email, createdAt, isVerified FROM User
   WHERE LOWER(email) NOT LIKE '%@epn.edu.ec' AND LOWER(email) NOT LIKE '%@gmail.com'
   ORDER BY id DESC`
);
console.table(rechazados.rows);

console.log('── uniqueId "123456789" (prueba típica) ──────────');
const tipico = await db.execute(`SELECT id, email FROM User WHERE uniqueId = '123456789'`);
console.table(tipico.rows);

console.log('── Cuentas sin verificar con token válido ────────');
const sinVerif = await db.execute(
  `SELECT id, email, verificationToken IS NOT NULL AS tieneToken, createdAt
   FROM User WHERE isVerified = 0 ORDER BY id DESC`
);
console.table(sinVerif.rows);
