# Documentación Oficial del Proyecto: Plataforma de Aprendizaje ESFOT

Esta documentación abarca la arquitectura completa del proyecto, dividida en **Backend** y **Frontend**, detallando tecnologías, endpoints, modelo de datos en grafo, variables de entorno, seguridad, pruebas automatizadas y resolución de tareas de integración.

---

## 1. Documentación del Backend

El Backend está construido bajo una arquitectura de controladores y servicios (API RESTful), diseñado para integrarse con bases de datos relacionales, grafos de conocimiento e Inteligencia Artificial.

### Tecnologías y Arquitectura
- **Framework:** Node.js (ES Modules) con Express.js.
- **Base de Datos Relacional:** SQLite en la nube utilizando **Turso** (`@libsql/client`).
- **Motor de Grafos y Conocimiento Curricular:** **Neo4j AuraDB** para modelado curricular avanzado, dependencias de prerrequisitos, autodiagnóstico y GraphRAG (`neo4j-driver`).
- **Algoritmo de Rutas Adaptativas:** `graphlib` implementando orden topológico ponderado (Algoritmo de Kahn con cola de prioridad pedagógica) y desarme automático de ciclos.
- **Inteligencia Artificial:** **Google Gemini API** (`@google/generative-ai`, modelo `gemini-3.5-flash`) desacoplado en la capa de servicios (`chat.service.js`).
- **Manejo de Archivos:** Multer para subidas locales y Cloudinary para almacenamiento en la nube de imágenes y PDFs.
- **Seguridad y Autenticación:** JWT (JSON Web Tokens), Bcrypt, Helmet (Cabeceras HTTP de seguridad), express-rate-limit (`aiLimiter` y limitador global).
- **Pruebas Automatizadas (TDD):** Jest con soporte para ES Modules verificando aciclicidad, prerrequisitos estrictos y grafos desconectados.
- **Auditoría de Seguridad y Pentesting:** Strix (`usestrix/strix v1.7.0`).

### Variables de Entorno (`.env`)
El archivo `.env` centraliza la configuración de conexiones externas (plantilla segura en `.env.example`):
- `PORT`: Puerto de ejecución (ej. 3000).
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`: Conexión remota a la base de datos Turso SQLite.
- `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD` / `NEO4J_DATABASE`: Conexión al clúster de Neo4j AuraDB.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: Credenciales de Cloudinary.
- `JWT_SECRET` / `JWT_EXPIRES_IN`: Clave secreta para firmar tokens y duración de sesión.
- `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`: Credenciales de Nodemailer para recuperación de cuentas.
- `FRONTEND_URL`: URL del cliente web para configuración de CORS.
- `GEMINI_API_KEY`: Clave de acceso a Google AI Studio (`gemini-3.5-flash`).
- `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`: Credenciales obligatorias para crear el primer administrador si no existe.

---

### Endpoints Principales (API REST)

#### 1. Autenticación (`/api/auth`)
- `POST /register`: Registro de estudiantes.
- `POST /login`: Inicio de sesión y emisión de JWT.
- `POST /forgot-password` / `PATCH /reset-password/:token`: Flujo de recuperación de contraseñas.
- `GET /profile`: Obtener datos del perfil autenticado.

#### 2. Grafo de Conocimiento y Rutas Adaptativas (`/api/graph`)
- `GET /subjects`: Lista las materias troncales en Neo4j con conteo de módulos y temas.
- `GET /subjects/:id/topics`: Obtiene módulos, temas y dependencias de prerrequisitos (`HARD`/`SOFT`) de una materia.
- `POST /self-diagnosis`: Guarda el autodiagnóstico del estudiante (escala 1 a 5) creando relaciones `(u:User)-[:SELF_REPORTED {level, date}]->(t:Topic)`.
- `POST /generate-personalized-route`: Ejecuta el algoritmo topológico con `graphlib`, genera una ruta adaptativa personalizada con módulos de refuerzo para temas con dificultades (`STRUGGLES_WITH`), persiste en Turso (`LearningRoute` y `Module`) y sincroniza con Neo4j. En caso de fallo de red en Neo4j, ejecuta rollback compensatorio en Turso.
- `GET /recommendations`: Retorna recomendaciones de materias cruzadas interdisciplinarias según el progreso del estudiante.
- `GET /topic/:topicId/context`: Devuelve el subgrafo local de un tema para GraphRAG.

#### 3. Rutas y Aprendizaje Estándar (`/api/routes`)
- `GET /`: Listar catálogo de rutas disponibles.
- `POST /generate`: Genera una ruta basada en texto o PDF subido consumiendo Gemini.
- `POST /:id/enroll`: Inscribe al estudiante en la ruta.
- `POST /complete-module`: Registra aprobación de módulo, otorga XP al usuario y enlaza `(u)-[:COMPLETED]->(m)` en Neo4j.

#### 4. IA y Evaluaciones (`/api/chat`) *(Protegido por `aiLimiter`)*
- `POST /send`: Procesa mensajes de tutoría inyectando contexto del subgrafo curricular (GraphRAG). Si el estudiante manifiesta bloqueo conceptual, registra automáticamente `STRUGGLES_WITH` en el grafo.
- `POST /assessment`: Genera o recupera desde caché de Turso los cuestionarios y retos dinámicos del módulo.

---

### Saneamiento de Deuda Técnica (P0)
1. **Eliminación de dependencias muertas:** Se eliminaron `bcryptjs` (redundante de `bcrypt`) y `docx` (~2MB sin uso) de `package.json`.
2. **Eliminación de archivo roto:** Se borró `src/api/authService.js` en el backend (código residual que intentaba importar un módulo inexistente del frontend).
3. **Desacoplamiento de Servicios:** La interacción directa con la API de Google Gemini en `chat.controller.js` fue extraída a `src/services/chat.service.js`.

---

## 2. Documentación del Frontend

El Frontend es una Single Page Application (SPA) responsiva y reactiva construida en React 19 y Tailwind CSS.

### Tecnologías y Componentes
- **Framework:** React 19 con Vite.
- **Estilos:** Tailwind CSS v4.
- **Navegación:** React Router.
- **Cliente API:** Módulos centralizados en `src/api/` (`graph.api.js`, `route.api.js`, `resource.api.js`, `admin.api.js`).
- **Componentes Principales:**
  - `SelfDiagnosisModal.jsx`: Modal interactivo de autodiagnóstico con escala del 1 al 5 por tema, selector de materia troncal y generación de ruta adaptativa (HU-013).
  - `RouteExplorer.jsx`: Explorador de rutas con Hero Banner que invita al autodiagnóstico curricular.
  - `RouteDetails.jsx`: Renderizado de la ruta con badges de prerrequisitos y alertas de *"⚡ Módulo de Refuerzo Sugerido"*.
  - `AIAssessmentForm.jsx`: Cuestionarios dinámicos con propagación de eventos para actualización reactiva de XP.
  - `StudentHeader.jsx` & `StudentSidebar.jsx`: Gamificación con nivel y barra de XP con refresco en tiempo real.

---

## 3. Pruebas Automatizadas (QA & TDD)

Se configuró una suite de pruebas unitarias en `tests/graphAlgorithm.test.js` ejecutables mediante:
```bash
npm test
```

### Casos de Prueba Verificados (5/5 Pasados ✅):
1. **Caso 1 (DAG Lineal):** Verifica que un grafo acíclico estándar $A \to B \to C$ se ordene estrictamente en orden topológico.
2. **Caso 2 (Prerrequisito HARD estricto):** Demuestra que si el estudiante tiene nivel 1 en $A$ y nivel 5 en $B$ (donde $B$ requiere $A$ como `HARD`), $A$ se programa obligatoriamente antes que $B$ y se marca como refuerzo sugerido.
3. **Caso 3 (Desarme de Ciclos):** Ante una dependencia circular $A \to B \to C \to A$, el algoritmo desactiva la relación `SOFT`, logrando la aciclicidad sin bucles infinitos.
4. **Caso 4 (Grafo Desconectado):** Verifica que múltiples componentes curriculares independientes se unifiquen y ordenen sin omitir temas.
5. **Caso 5 (Urgencia pedagógica por STRUGGLES_WITH):** Los temas marcados con dificultades reciben $+20$ puntos de prioridad y se agrupan en el módulo de refuerzo.

---

## 4. Estado de Tareas (Resolución To-Do del Frontend)

> [!NOTE]
> Todas las tareas pendientes del equipo frontend han sido implementadas y resueltas exitosamente:

1. **Re-renderizado en Vivo (Reactividad de XP) — ✅ RESUELTO:**
   - `RouteDetails.jsx` ahora recibe la prop `onAssessmentComplete={handleAssessmentComplete}` y la propaga a `AIAssessmentForm.jsx`. Al aprobar el examen, el estado global del usuario se actualiza inmediatamente sin recargar la página, refrescando la barra de XP en `StudentHeader.jsx`.

2. **Restricción de Avance Visual y Badges — ✅ RESUELTO:**
   - `RouteDetails.jsx` identifica módulos de refuerzo y temas con prerrequisitos pendientes, desplegando badges ámbar (*"⚡ Módulo de Refuerzo Sugerido"*) y azules de prerrequisitos curriculares.

3. **Sanitización de URLs y Markdown — ✅ RESUELTO:**
   - La función `sanitizeUrl` previene la apertura de enlaces maliciosos o protocolos no autorizados como `javascript:`.

---

---
<div align="center">
  <i>Documento Oficial Actualizado - Plataforma de Aprendizaje ESFOT (EPN)</i>
</div>
