import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { initDB, turso } from './config/turso.js';
import { runMigrations } from './db/migrate.js';
import { ensureBaseRoles, warnAboutLockedAccounts } from './services/init.service.js';
import { verifyNeo4jConnection, closeDriver } from './services/neo4j.service.js';

import authRoutes     from './routes/auth.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import routeRoutes    from './routes/route.routes.js';
import uploadRoutes   from './routes/upload.routes.js';
import chatRoutes     from './routes/chat.routes.js';
import executeRoutes  from './routes/execute.routes.js';
import graphRoutes    from './routes/graph.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { aiLimiter }  from './middlewares/rateLimiter.middleware.js';

const app = express();

/**
 * Render / Railway / Vercel colocan un proxy delante del proceso. Sin esto,
 * `req.ip` es siempre la IP del proxy: el rate limit global contaría a TODOS
 * los usuarios como si fueran uno solo (y un health check cada 30 s agotaría
 * la cuota). Con `1` confiamos en el primer salto del proxy.
 */
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Configurable por entorno: el valor de desarrollo (100) es muy bajo para
  // una red universitaria donde muchos alumnos salen con la misma IP pública.
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});

/**
 * Orígenes permitidos. `FRONTEND_URL` admite varias URLs separadas por coma
 * (dominio de producción + previews de Vercel), p. ej.:
 *   FRONTEND_URL=https://esfot.vercel.app,https://esfot-git-main.vercel.app
 */
const defaultOrigins = [
  'https://esfotroutes.vercel.app',
  'https://tic-rutas-aprendizaje.vercel.app'
];

const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((value) => {
    try {
      const clean = value.trim().replace(/^["']|["']$/g, '');
      return clean ? new URL(clean).origin : null;
    } catch {
      if (value.trim()) console.warn('⚠️  FRONTEND_URL no es una URL válida:', value.trim());
      return null;
    }
  })
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...envOrigins]);

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Se comparan host y puerto EXACTOS. Antes se usaba `startsWith`, así que
    // `http://localhost.atacker.com` pasaba el filtro y, con
    // `credentials: true`, el navegador le devolvía la respuesta con las
    // credenciales de la víctima.
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      return callback(null, false);
    }

    // Desarrollo local: se acepta cualquier puerto de loopback porque Vite
    // salta a 5174/5175 cuando 5173 está ocupado y, con los puertos fijos
    // anteriores, el navegador empezaba a rechazar todas las peticiones.
    const isLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (isLoopback) {
      return callback(null, true);
    }

    if (allowedOrigins.has(parsed.origin)) {
      return callback(null, true);
    }

    // Permitir subdominios de preview en Vercel para este proyecto
    if (/^https:\/\/(esfotroutes|tic-rutas-aprendizaje)(-[a-z0-9-]+)?\.vercel\.app$/.test(parsed.origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 CORS bloqueó el origen: ${parsed.origin}`);
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

/**
 * Health check ANTES del limitador: las plataformas de despliegue lo consultan
 * cada pocos segundos y no debe consumir la cuota de peticiones.
 */
app.get("/api/health", (req, res) => res.json({ status: "ok", message: "API ESFOT funcionando ✅" }));

app.use(limiter);

app.use("/api/auth",      authRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/routes",    routeRoutes);
app.use("/api/upload",    uploadRoutes);
app.use("/api/chat",      aiLimiter, chatRoutes);
app.use("/api/execute",   executeRoutes);
app.use("/api/graph",     graphRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startServer = async () => {
  // Turso es remoto: reintenta el arranque si la red no responde (timeout transitorio)
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await initDB();           // Activa foreign_keys en SQLite
      break;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      console.warn(`⚠️  Turso no responde (intento ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
      console.warn("   Reintentando en 5s...");
      await sleep(5000);
    }
  }

  await runMigrations();        // Crea tablas si no existen
  await ensureBaseRoles();     // Garantiza roles base y al menos un administrador
  await warnAboutLockedAccounts(); // Avisa de cuentas bloqueadas sin salida
  await verifyNeo4jConnection(); // Verifica enlace con Grafo de Conocimiento

  // `0.0.0.0` explícito: algunos contenedores/PaaS no enrutan si el proceso
  // escucha solo en loopback.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en puerto ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(
      allowedOrigins.size
        ? `🌐 CORS permitido para: ${[...allowedOrigins].join(', ')}`
        : '🌐 CORS: solo orígenes de loopback (desarrollo). Define FRONTEND_URL en producción.'
    );
  });
};

startServer().catch((err) => {
  console.error("❌ No se pudo iniciar el servidor:", err.message);
  process.exit(1);
});

/**
 * Cierre ordenado: sin esto el driver de Neo4j y el cliente de Turso se
 * quedan con los sockets abiertos y el proceso no termina solo.
 */
const shutdown = async (signal) => {
  console.log(`\n🛑 ${signal} recibido. Cerrando conexiones...`);
  try {
    await closeDriver();
    await turso.close();
  } catch (err) {
    console.error('⚠️  Error cerrando conexiones:', err.message);
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));