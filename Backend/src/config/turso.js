import { createClient } from "@libsql/client";
import "dotenv/config";

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

/**
 * Activa las foreign keys de SQLite (desactivadas por defecto en libSQL).
 * Debe llamarse una vez al arrancar el servidor.
 */
export const initDB = async () => {
  await turso.execute("PRAGMA foreign_keys = ON");
};
