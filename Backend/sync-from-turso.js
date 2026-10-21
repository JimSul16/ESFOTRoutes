import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function syncTursoToLocal() {
  console.log("🚀 Iniciando sincronización de Turso (Nube) a dev.db (Local)...");

  const remoteUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!remoteUrl || !remoteUrl.startsWith("libsql://")) {
    console.error("❌ TURSO_DATABASE_URL no está configurado con una URL remota de Turso (libsql://...)");
    process.exit(1);
  }

  const remote = createClient({
    url: remoteUrl,
    authToken: authToken,
  });

  const local = createClient({
    url: "file:./dev.db",
  });

  // 1. Inicializar esquema en base local limpia
  console.log("📦 Limpiando y aplicando schema.sql en dev.db...");
  await local.execute("PRAGMA foreign_keys = OFF;");

  const dropTables = [
    "ModuleAssessment", "UserSessionLog", "ModuleProgress", "Enrollment",
    "ChatMessage", "ChatSession", "ModuleResource", "Module", "LearningRoute",
    "Resource", "RolePermission", "UserRole", "User", "Permission", "Role",
    "LearningRoute_new"
  ];
  for (const t of dropTables) {
    await local.execute(`DROP TABLE IF EXISTS ${t};`);
  }

  const sql = readFileSync(join(__dirname, "src", "db", "schema.sql"), "utf8")
    .replace(/--[^\n]*/g, "");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await local.execute(stmt + ";");
  }

  // 2. Desactivar llaves foráneas para migración limpia
  await local.execute("PRAGMA foreign_keys = OFF;");

  const tables = [
    "Role",
    "Permission",
    "User",
    "UserRole",
    "RolePermission",
    "Resource",
    "LearningRoute",
    "Module",
    "ModuleResource",
    "ChatSession",
    "ChatMessage",
    "Enrollment",
    "ModuleProgress",
    "UserSessionLog",
    "ModuleAssessment",
  ];

  for (const table of tables) {
    console.log(`⏳ Sincronizando tabla ${table}...`);
    // Borrar datos previos en local
    await local.execute(`DELETE FROM ${table};`);

    // Obtener datos remotos
    const remoteData = await remote.execute(`SELECT * FROM ${table}`);
    if (remoteData.rows.length === 0) {
      console.log(`   ℹ️ 0 registros en ${table}`);
      continue;
    }

    // Insertar registros en local
    const columns = remoteData.columns;
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

    for (const row of remoteData.rows) {
      const values = columns.map((col) => row[col]);
      await local.execute({
        sql: insertSql,
        args: values,
      });
    }

    console.log(`   ✅ ${remoteData.rows.length} registros copiados en ${table}`);
  }

  // 3. Reactivar llaves foráneas
  await local.execute("PRAGMA foreign_keys = ON;");

  console.log("🎉 ¡Sincronización completada con éxito en dev.db!");
}

syncTursoToLocal().catch((err) => {
  console.error("❌ Error durante la sincronización:", err);
  process.exit(1);
});
