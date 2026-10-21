import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

/**
 * Codigos de error de red transitorios (undici/Node.js).
 * Son los que indican que la RED fallo, no la consulta SQL.
 */
const NETWORK_ERROR_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

/**
 * Detecta si un error (o alguna de sus causas encadenadas) es de red.
 * Los errores de SQL (constraints, sintaxis, etc.) NO deben reintentarse.
 */
const isNetworkError = (err) => {
  let current = err;
  while (current) {
    if (current.code && NETWORK_ERROR_CODES.has(current.code)) return true;
    current = current.cause;
  }
  return /fetch failed|socket hang up/i.test(String(err?.message ?? ""));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reintenta una operacion con backoff exponencial + jitter.
 * Solo reintenta errores de RED; los errores de SQL se propagan de inmediato.
 */
const withRetry = async (operation, { retries = 3, baseDelayMs = 1000 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isNetworkError(err) || attempt === retries) throw err;
      lastError = err;
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 300);
      const code = err?.cause?.code || err?.code || err?.message;
      console.warn(
        `⚠️  Turso: fallo de red (${code}). Reintento ${attempt + 1}/${retries} en ${delay}ms...`
      );
      await sleep(delay);
    }
  }
  throw lastError;
};

/**
 * Cliente Turso con reintentos automaticos ante fallos transitorios de red
 * (p. ej. UND_ERR_CONNECT_TIMEOUT en redes inestables como el Wi-Fi del campus).
 * Mantiene la misma API que el cliente original (execute, batch, ...).
 */
export const turso = {
  execute: (stmt, args) => withRetry(() => client.execute(stmt, args)),
  batch: (stmts, mode) => withRetry(() => client.batch(stmts, mode)),
  executeMultiple: (stmts) => withRetry(() => client.executeMultiple(stmts)),
  close: () => client.close(),
  /** Acceso al cliente crudo de @libsql/client si se necesita en el futuro. */
  get client() {
    return client;
  },
};

/**
 * Activa las foreign keys de SQLite (desactivadas por defecto en libSQL).
 * Debe llamarse una vez al arrancar el servidor.
 */
export const initDB = async () => {
  await turso.execute("PRAGMA foreign_keys = ON");
};
