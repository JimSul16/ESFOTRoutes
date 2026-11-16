/**
 * Consulta / borrado de un usuario en la BASE DE DATOS de producción (Turso).
 *
 * Uso:
 *   node scripts/db-usuario.mjs <email>            → consulta (verifica que sea la BD de producción)
 *   node scripts/db-usuario.mjs <email> --delete   → borra UserRole + User
 *
 * Lee las credenciales TURSO_* de Backend/.env (activas o comentadas).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envRaw = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');

const pick = (key) => {
  // Preferimos la línea activa; si apunta a un archivo local, usamos la comentada (producción).
  const activa = envRaw.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
  const comentada = envRaw.match(new RegExp(`^#\\s*${key}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
  const esRed = (v) => v && /^(libsql|https?):\/\//.test(v);
  if (esRed(activa)) return { value: activa, origen: 'línea activa' };
  if (esRed(comentada)) return { value: comentada, origen: 'línea comentada de .env' };
  return { value: activa || comentada || '', origen: 'sin conexión remota' };
};

const url = pick('TURSO_DATABASE_URL');
const token = pick('TURSO_AUTH_TOKEN');

const email = (process.argv[2] || '').toLowerCase();
const borrar = process.argv.includes('--delete');
if (!email || !email.includes('@')) {
  console.log('Uso: node scripts/db-usuario.mjs <email> [--delete]');
  process.exit(1);
}

if (!/^libsql|^https/.test(url.value)) {
  console.log('✘ No hay credenciales remotas de Turso en Backend/.env (solo BD local).');
  process.exit(1);
}

const db = createClient({ url: url.value, authToken: token.value });
console.log(`\n🗄️  BD: ${url.value}  [${url.origen}]\n`);

const show = (rows) => rows.map((r) => ({ ...r }));

// 1) ¿Es realmente la BD de producción? Buscamos un usuario creado vía API pública.
const prueba = await db.execute({
  sql: `SELECT id, email, isVerified, createdAt FROM User WHERE email = ?`,
  args: ['prueba.correos.39397242@gmail.com'],
});
console.log(prueba.rows.length
  ? `✔ Confirmado: es la BD de producción (existe el usuario de prueba creado por la API: id ${prueba.rows[0].id})`
  : '⚠️ El usuario de prueba creado por la API NO está en esta BD (verificar credenciales).');

// 2) Usuario objetivo (con tokens solo si se pide --tokens)
const verTokens = process.argv.includes('--tokens');
const user = await db.execute({
  sql: `SELECT id, name, email, career, semester, uniqueId, isVerified, isActive, isLocked, createdAt
          ${verTokens ? ', verificationToken, resetToken' : ''}
          FROM User WHERE LOWER(email) = ?`,
  args: [email],
});

if (!user.rows.length) {
  console.log(`\nℹ️ "${email}" NO existe en la BD. No hay nada que borrar.`);
  process.exit(0);
}

const u = user.rows[0];
const roles = await db.execute({
  sql: `SELECT r.name FROM UserRole ur JOIN Role r ON r.id = ur.roleId WHERE ur.userId = ?`,
  args: [u.id],
});

console.log('\n── Usuario encontrado ─────────────────────────────');
console.table([{ ...u, roles: roles.rows.map((r) => r.name).join(', ') }]);

if (verTokens) {
  const FRONT = 'https://tic-rutas-aprendizaje.vercel.app';
  console.log(u.verificationToken
    ? `\n🔗 Link de verificación: ${FRONT}/confirm/${u.verificationToken}`
    : '\n(i sin verificationToken — la cuenta ya estaría verificada)');
  if (u.resetToken) console.log(`🔑 Link de reset: ${FRONT}/reset-password/${u.resetToken}`);
}

if (!borrar) {
  console.log('↩️  Solo consulta. Para borrar: --delete\n');
  process.exit(0);
}

// 3) Borrado: primero TODAS las tablas hijas que referencian a User
//    (descubiertas con PRAGMA foreign_key_list), en orden inverso de creación.
const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
const hijos = [];
for (const { name } of tables.rows) {
  if (name === 'User') continue;
  try {
    const fks = await db.execute(`PRAGMA foreign_key_list("${name}")`);
    for (const fk of fks.rows) {
      if (String(fk.table).toLowerCase() === 'user' && fk.from) {
        hijos.push({ tabla: name, columna: fk.from, onDelete: fk.on_delete });
        break;
      }
    }
  } catch {
    /* tabla sin PRAGMA soportado */
  }
}
console.log(`\nTablas hijas de User detectadas: ${hijos.map((h) => `${h.tabla}.${h.columna}`).join(', ') || '(ninguna)'}`);

for (const { tabla, columna } of hijos.reverse()) {
  try {
    const r = await db.execute({ sql: `DELETE FROM "${tabla}" WHERE "${columna}" = ?`, args: [u.id] });
    console.log(`  • ${tabla}: ${r.rowsAffected} fila(s) borrada(s)`);
  } catch (e) {
    console.log(`  • ${tabla}: ERROR → ${e.message}`);
  }
}

const del = await db.execute({ sql: `DELETE FROM User WHERE id = ?`, args: [u.id] });
console.log(`\n✔ User: ${del.rowsAffected} fila(s) borrada(s) para ${email}`);

const check = await db.execute({ sql: `SELECT id FROM User WHERE LOWER(email) = ?`, args: [email] });
console.log(check.rows.length ? '✘ Verificación: el usuario AÚN existe.' : '✔ Verificación: el usuario ya no existe.');
