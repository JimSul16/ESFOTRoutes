# Plan de despliegue — Plataforma ESFOT

**Objetivo:** backend en producción accesible desde la red del campus + frontend
de Vercel conectado a él.

**Fecha de inicio:** 25/10/2026
**Repositorio:** `JimSul16/ESFOTRoutes` (rama `main`)

---

## Diagnóstico

Dos problemas distintos, no uno:

1. **Red del campus:** bloquea conexiones salientes (Neo4j AuraDB usa el puerto
   7687). Nada que se ejecute en la universidad va a funcionar. → Se resuelve
   desplegando en un datacenter.
2. **El frontend desplegado apunta a `https://localhost:3000/api`**
   (verificado en el bundle `auth.api-B3DU5DGb.js` de
   `tic-rutas-aprendizaje.vercel.app`). El sitio en Vercel le habla a la PC del
   desarrollador. → Se resuelve con `VITE_API_URL` + redeploy.

Mientras el punto 2 no se corrija, **aunque el backend quede perfecto, el login
seguirá fallando**.

---

## Definición de terminado

- [ ] `GET /api/health` del backend responde `{"status":"ok"}`
- [ ] El backend permite CORS desde `https://esfotroutes.vercel.app`
- [ ] El bundle de Vercel ya **no** contiene `localhost:3000`
- [ ] Login real desde el sitio de Vercel entra al dashboard
- [ ] El servicio no se duerme (monitor activo)

---

## Fase 0 — Código listo ✅

- [x] `trust proxy`, health check fuera del rate limit, `RATE_LIMIT_MAX`
- [x] CORS con múltiples orígenes y loopback en cualquier puerto
- [x] `render.yaml` en la raíz (`rootDir: Backend`, plan free, health check)
- [x] Aviso en consola si el build de producción no tiene `VITE_API_URL`
- [x] Script de verificación: `npm run verify:deploy -- <url-backend>`
- [x] Guía: `DESPLIEGUE_PRODUCCION.md`

---

## Fase 1 — Backend en Render (~10 min, tú)

- [ ] Entrar a render.com con GitHub (no pide tarjeta)
- [ ] **New +** → **Blueprint** → repo `ESFOTRoutes`
- [ ] Confirmar servicio `esfot-backend` → **Apply**
- [ ] Esperar el primer deploy

**Resultado esperado:** una URL `https://esfot-backend.onrender.com`.
Anótala, se usa en la Fase 4.

---

## Fase 2 — Variables de entorno (~5 min, tú)

En el dashboard del servicio → **Environment**. Valores desde `Backend/.env`:

- [ ] `TURSO_DATABASE_URL` → la línea comentada `libsql://esfotroute-db-...`
- [ ] `TURSO_AUTH_TOKEN` → el token comentado
- [ ] `NEO4J_URI` → `neo4j+s://b2adc2aa.databases.neo4j.io`
- [ ] `NEO4J_USERNAME` → `b2adc2aa`
- [ ] `NEO4J_PASSWORD` → el del `.env`
- [ ] `NEO4J_DATABASE` → `b2adc2aa`
- [ ] `JWT_SECRET` → el del `.env`
- [ ] `FRONTEND_URL` → **`https://esfotroutes.vercel.app`**
- [ ] `GEMINI_API_KEY`, `GEMINI_API_KEY_BACKUP` → los del `.env`
- [ ] `SMTP_USER`, `SMTP_PASS` → los del `.env`
- [ ] Cloudinary / JDoodle → vacíos (no bloquean el login)

> La BD de Turso Cloud ya fue verificada: **9 usuarios, 5 rutas**.

---

## Fase 3 — Verificación técnica (~1 min)

```powershell
cd Backend
npm run verify:deploy -- https://esfot-backend.onrender.com
```

- [ ] Health check ✅
- [ ] CORS ✅
- [ ] Base de datos ✅

Si CORS falla: `FRONTEND_URL` mal escrito (sin `/` final, con `https`).
Si la BD falla con 500: `TURSO_*` no cargó.

---

## Fase 4 — Frontend en Vercel (~3 min, con tu compañero)

En el proyecto de Vercel → **Settings → Environment Variables**:

- [ ] `VITE_API_URL` = `https://esfot-backend.onrender.com/api`
- [ ] **Deployments → Redeploy** (obligatorio: Vite la incrusta en el build)
- [ ] Verificar que el bundle nuevo ya no tenga `localhost:3000`

Comprobación rápida del bundle (PowerShell):

```powershell
(Invoke-WebRequest https://esfotroutes.vercel.app -UseBasicParsing).Content
# buscar el <script src>, descargarlo y comprobar que NO aparece localhost:3000
```

---

## Fase 5 — Prueba de extremo a extremo (~5 min)

- [ ] Abrir `https://esfotroutes.vercel.app`
- [ ] Login con una cuenta real (de las 9 de Turso)
- [ ] Entrar al dashboard
- [ ] Abrir una ruta → confirmar que el grafo responde
- [ ] Probar el chat (Gemini) una vez

---

## Fase 6 — Anti cold start (~5 min)

- [ ] uptimerobot.com → Add New Monitor → HTTP(s)
- [ ] URL: `https://esfot-backend.onrender.com/api/health`
- [ ] Intervalo: 5 minutos

---

## Fase 7 — Cierre (opcional)

- [ ] Respaldo de Turso antes de futuras migraciones
- [ ] Dominio propio en Render (si la universidad bloquea `onrender.com`)
- [ ] Revisar que `.env` siga fuera de git (`git ls-files | findstr .env`)

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El primer arranque ejecuta migraciones sobre la BD real | Baja (ya corrieron) | Respaldo previo con Turso CLI |
| Build falla en `bcrypt` | Baja | `NODE_VERSION=20` y redeploy |
| `FRONTEND_URL` con `/` final | Media | Copiar exactamente la URL sin barra |
| Alguien olvida el redeploy de Vercel | Alta | Fase 4 y Fase 5 lo detectan |
| Cold start en la defensa | Media | Fase 6 |
