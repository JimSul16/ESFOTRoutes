# Despliegue en producción

Guía para correr la Plataforma ESFOT fuera de la red de la universidad.

## Por qué falla en el campus

El backend no "choca" con un puerto local: **la red institucional bloquea las
conexiones salientes** que necesita.

| Servicio | Puerto | Qué pasa en el campus |
|---|---|---|
| Neo4j AuraDB | `7687` (Bolt/TLS) | Bloqueado → el grafo no responde → login y rutas fallan |
| Turso Cloud | `443` | Inestable/bloqueado → si usas `file:./dev.db` no pasa nada, pero no hay datos remotos |
| Backend | `3000` | No se puede exponer hacia afuera |

Al desplegar el backend en un datacenter, **el servidor sale a Internet sin
restricciones** y el navegador solo necesita HTTPS (443), que la universidad sí
permite. Ese es el arreglo.

---

## Requisito crítico: la base de datos

`Backend/.env` tiene hoy:

```env
TURSO_DATABASE_URL="file:./dev.db"
```

Ese archivo **está en `.gitignore`**. Si despliegas así, el hosting arranca con
una base **vacía**: las migraciones crean las tablas, pero no hay usuarios y el
login siempre responde "credenciales inválidas".

Antes de desplegar, cambia a la nube:

```env
TURSO_DATABASE_URL="libsql://esfotroute-db-....turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOi..."
```

> ✅ Verificado el 25/10/2026: la base de Turso Cloud responde y contiene
> **9 usuarios y 5 rutas**, así que no hace falta migrar `dev.db`.

---

## Paso 1 — Backend en Render

1. Sube los cambios a GitHub.
2. Render → **New → Blueprint** → selecciona el repositorio.
   Render detecta `render.yaml` en la raíz y crea el servicio solo.
   *(Alternativa manual: New → Web Service, Root Directory `Backend`,
   Build `npm install`, Start `npm start`, Health Check `/api/health`.)*
3. Rellena las variables marcadas como `sync: false` en el dashboard.
   Las más importantes:

   ```
   TURSO_DATABASE_URL   → libsql://...turso.io
   TURSO_AUTH_TOKEN     → token de Turso
   NEO4J_URI            → neo4j+s://....databases.neo4j.io
   NEO4J_USERNAME       → b2adc2aa
   NEO4J_PASSWORD       → (la del .env)
   NEO4J_DATABASE       → b2adc2aa
   JWT_SECRET           → (el del .env, o uno nuevo más largo)
   FRONTEND_URL         → https://TU-FRONTEND.vercel.app  (se ajusta en el paso 2)
   GEMINI_API_KEY       → ...
   SMTP_USER / SMTP_PASS
   ```
4. Cuando termine el deploy, prueba:

   ```
   https://TU-BACKEND.onrender.com/api/health
   ```

   Debe devolver `{"status":"ok", ...}`.

---

## Paso 2 — Frontend en Vercel

1. Vercel → Add New Project → importa el repo.
2. **Root Directory:** `Frontend`
3. Framework: Vite (lo detecta solo). Build: `npm run build`. Output: `dist`.
4. Environment Variable **antes de desplegar**:

   ```
   VITE_API_URL = https://TU-BACKEND.onrender.com/api
   ```

   Vite la incrusta en el build: si la cambias después, hay que **redeployar**.
5. Copia el dominio final (`https://algo.vercel.app`) y ponlo en `FRONTEND_URL`
   del backend en Render. Render reinicia el servicio automáticamente.

---

## Paso 3 — Verificación

1. `GET /api/health` → `200 ok`.
2. En los logs de Render debe aparecer:
   ```
   ✅ Conectado a Neo4j AuraDB (...)
   🌐 CORS permitido para: https://tu-frontend.vercel.app
   ```
3. Login desde el frontend de Vercel.
4. Si el login falla, revisa en este orden: usuarios en Turso → `JWT_SECRET`
   igual en todos los entornos → `FRONTEND_URL` exacto (sin `/` final).

---

## Cosas que debes saber

- **Plan free de Render:** el servicio se duerme tras ~15 min sin tráfico y la
  primera petición tarda ~50 s. Normal para una demo; para la defensa de tesis
  entra 5 minutos antes o usa un ping programado a `/api/health`.
- **`RATE_LIMIT_MAX`** está en 300 peticiones/15 min. Si toda la universidad
  entra por la misma IP pública, puedes subirlo.
- **Nunca subas `.env`** al repo. Ya está ignorado; configura los valores solo
  en Render/Vercel.
- **Túnel alternativo (Cloudflare Tunnel / ngrok):** sirve para exponer el
  frontend local, pero **no arregla** el bloqueo del puerto 7687 de Neo4j,
  porque el bloqueo ocurre en tu red, no en el navegador.

---

## Solución de problemas

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| `CORS blocked` en consola | `FRONTEND_URL` no coincide con el dominio | Copiar el origen exacto (sin `/` final) y reiniciar |
| Login "credenciales inválidas" con usuario correcto | BD vacía (`file:./dev.db`) | Usar Turso Cloud |
| `429 Too many requests` | Rate limit muy bajo o sin `trust proxy` | `RATE_LIMIT_MAX` alto; `trust proxy` ya está configurado |
| Todo tarda ~50 s la primera vez | Cold start del plan free | Plan pago o ping periódico |
| El grafo responde vacío | Neo4j no alcanzable | Revisar logs: `No se pudo conectar a Neo4j AuraDB` |
| `Neo4j no configurado` | Faltan `NEO4J_URI`/`NEO4J_PASSWORD` | Cargarlas en el dashboard |
