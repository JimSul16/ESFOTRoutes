import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { initDB } from './config/turso.js';
import { runMigrations } from './db/migrate.js';
import { initializeFirstAdmin } from './services/init.service.js';
import { verifyNeo4jConnection } from './services/neo4j.service.js';

import authRoutes     from './routes/auth.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import routeRoutes    from './routes/route.routes.js';
import uploadRoutes   from './routes/upload.routes.js';
import chatRoutes     from './routes/chat.routes.js';
import executeRoutes  from './routes/execute.routes.js';
import graphRoutes    from './routes/graph.routes.js';
import { aiLimiter }  from './middlewares/rateLimiter.middleware.js';

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later."
});

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, process.env.FRONTEND_URL || 'http://localhost:3000');
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(limiter);

app.use("/api/auth",      authRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/routes",    routeRoutes);
app.use("/api/upload",    uploadRoutes);
app.use("/api/chat",      aiLimiter, chatRoutes);
app.use("/api/execute",   executeRoutes);
app.use("/api/graph",     graphRoutes);

app.use(express.static('public'));

app.get("/api/health", (req, res) => res.json({ status: "ok", message: "API ESFOT funcionando ✅" }));

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await initDB();               // Activa foreign_keys en SQLite
  await runMigrations();        // Crea tablas si no existen
  await initializeFirstAdmin(); // Garantiza Super Admin
  await verifyNeo4jConnection(); // Verifica enlace con Grafo de Conocimiento

  app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
  });
};

startServer();