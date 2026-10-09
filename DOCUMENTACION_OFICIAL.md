# Documentación Oficial del Proyecto: Plataforma de Aprendizaje ESFOT

Esta documentación abarca la arquitectura completa del proyecto, dividida en **Backend** y **Frontend**, detallando tecnologías, endpoints, variables de entorno, seguridad, escalabilidad y una lista de tareas pendientes (To-Do) para el equipo de desarrollo.

---

## 1. Documentación del Backend

El Backend está construido bajo una arquitectura de controladores y servicios (API RESTful), diseñado para integrarse con bases de datos relacionales, grafos de conocimiento e Inteligencia Artificial.

### Tecnologías y Arquitectura
- **Framework:** Node.js con Express.js.
- **Base de Datos Relacional:** SQLite en la nube utilizando **Turso** (`@libsql/client`).
- **Grafo de Conocimiento:** **Neo4j** (AuraDB) para mapear usuarios, rutas y progreso (`neo4j-driver`).
- **Inteligencia Artificial:** **Google Gemini API** (`@google/generative-ai`) para generación de rutas, evaluaciones y tutoría.
- **Manejo de Archivos:** Multer para subidas locales y Cloudinary para almacenamiento en la nube de imágenes y PDFs.
- **Seguridad y Autenticación:** JWT (JSON Web Tokens), Bcrypt/Bcryptjs (Hash de contraseñas), Helmet (Cabeceras HTTP de seguridad), express-rate-limit (Prevención DoS).

### Variables de Entorno (`.env`)
El archivo `.env` centraliza la configuración de conexiones externas:
- `PORT`: Puerto de ejecución (ej. 3000).
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`: Credenciales para conexión remota a la base de datos Turso. (Para desarrollo local se puede usar `file:./dev.db`).
- `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD`: Conexión al clúster de Neo4j AuraDB.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: Credenciales de Cloudinary.
- `JWT_SECRET` / `JWT_EXPIRES_IN`: Clave secreta para firmar tokens y su expiración.
- `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`: Credenciales de Nodemailer para recuperación de cuentas.
- `FRONTEND_URL`: URL del cliente web para configurar CORS.
- `GEMINI_API_KEY`: Clave de acceso a Google AI Studio (Gemini 3.5 Flash).
- `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`: Credenciales para el volcado o seeder del primer administrador.

### Endpoints Principales (API REST)
**Autenticación (`/api/auth`):**
- `POST /register`: Registro de estudiantes.
- `POST /login`: Inicio de sesión y emisión de JWT.
- `POST /forgot-password` / `PATCH /reset-password/:token`: Flujo de recuperación.
- `GET /profile`: Obtener datos del perfil autenticado.

**Rutas y Aprendizaje (`/api/routes`):**
- `POST /generate`: Genera una ruta personalizada basada en un texto o un PDF subido, consumiendo la API de Gemini. Guarda la ruta en Turso y en Neo4j (`syncRouteToGraph`).
- `POST /:id/enroll`: Inscribe al estudiante en la ruta.
- `POST /complete-module`: Registra que un usuario aprobó un módulo. Aumenta XP en Turso, y crea la relación `(u)-[:COMPLETED]->(m)` en Neo4j.

**IA y Evaluaciones (`/api/chat`):**
- `POST /assessment`: Recibe el ID del módulo. Primero busca en Turso (`ModuleAssessment`) si la evaluación ya existe para devolverla al instante. Si no existe, llama a Gemini para crearla, la guarda en caché (Turso) y la devuelve.
- `POST /send`: Maneja la tutoría por chat con IA.

### Pruebas (Testing)
Actualmente, el `package.json` incluye `jest` en sus dependencias, pero **no existe un directorio de pruebas (tests) automatizadas**. 
- **Pruebas sugeridas para el Backend:** Implementar pruebas unitarias para los controladores y pruebas de integración usando `Supertest` para los endpoints críticos (`/login`, `/complete-module`, `/generate`).

---

## 2. Documentación del Frontend

El Frontend es una Single Page Application (SPA) moderna, rápida y responsiva, enfocada en la experiencia del estudiante.

### Tecnologías y Arquitectura
- **Framework:** React 19 con Vite.
- **Estilos:** Tailwind CSS v4 (con PostCSS) y diseño responsivo.
- **Manejo de Estado:** Zustand (Estado global ligero).
- **Formularios y Validación:** React Hook Form junto con Zod.
- **Enrutamiento:** React Router v7.
- **Integraciones Visuales:** Monaco Editor (para el entorno de código IDE JDoodle), React Markdown (para renderizar respuestas de la IA), React Toastify (Notificaciones push).

### Variables de Entorno (`.env`)
- `VITE_API_URL`: Apunta a la URL del backend (ej. `http://localhost:3000/api`).
- `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER`: (Si se usa Pusher para webhooks/sockets).

### Manejo de Estado, Arreglos y Funciones
- **Componentes Clave:** 
  - `RouteDetails.jsx`: Gestiona la visualización de la ruta. Muestra el botón "Iniciar Reto Final" de forma condicional (solo en el último módulo).
  - `AIAssessmentForm.jsx`: Componente encargado de renderizar y calificar la evaluación.
- **Arreglos Importantes:**
  - `CODING_KEYWORDS`: `['javascript', 'js', 'react', 'node', 'python', 'html', 'css', 'web', 'programación']`. Este arreglo permite que el Frontend identifique si el módulo actual requiere programación. Si coincide, despliega automáticamente el `CodeWorkspace` (Monaco Editor).
- **Flujo de Completado:** Cuando el estudiante obtiene >= 70%, `AIAssessmentForm` hace un POST a `/complete-module`. 

---

## 3. Seguridad y Escalabilidad

### Seguridad Implementada
- **Backend:** 
  - Protección de endpoints con Middleware JWT y verificación de roles (`verifyToken`, `checkRoles`).
  - Límite de carga estricto con **Multer (5MB máximo)** para PDFs y validación de Mimetype (mitigación básica de DoS y malware).
  - El driver local de SQLite (Turso) utiliza `args` parametrizados, previniendo inyección SQL.
- **Frontend:** Uso de Rutas Protegidas en React Router.

### Escalabilidad (Grafos y Caché)
- **Caché de IA:** Las evaluaciones de Gemini ahora se almacenan en SQLite (`ModuleAssessment`). Esto escala masivamente la plataforma, ya que 1,000 estudiantes accediendo al mismo módulo no harán 1,000 peticiones a Google AI, sino a la base local, ahorrando cuota.
- **Grafo Neo4j:** La arquitectura está lista para Big Data. La inserción pasiva `(u:User)-[:COMPLETED]->(m:Module)` permitirá en el futuro implementar un motor de recomendaciones (Filtro Colaborativo) muy avanzado que SQL tradicional no podría manejar con eficiencia.

---

## 4. Tareas Pendientes (To-Do para el Frontend Developer)

> [!TIP]
> **Para el desarrollador Frontend:** El backend ya expone los datos correctamente. Por favor enfócate en solucionar los siguientes puntos de experiencia de usuario (UX) e integración:

1. **Re-renderizado en Vivo (Reactividad de XP):**
   - *Problema:* Al aprobar un módulo, el componente `AIAssessmentForm.jsx` muestra el Toast de éxito, pero la barra superior del Navbar (donde está el Nivel y la XP) no se actualiza a menos que se recargue la página.
   - *Solución:* Pasar una prop `onAssessmentComplete={refreshUserData}` desde el componente padre (ej. Dashboard) hasta `AIAssessmentForm`, o mejor aún, actualizar el store de **Zustand** con la respuesta del backend (`newXp`, `newLevel`).

2. **Manejo de Errores Globales (Fallbacks):**
   - *Problema:* Si el servidor de la API falla, la pantalla se queda cargando o lanza un error por consola.
   - *Solución:* Implementar un *ErrorBoundary* global y estados de `isError` en las consultas de Zustand, mostrando un mensaje amigable al estudiante (ej. "Nuestros servidores están en mantenimiento").

3. **Restricción de Avance Visual (Opcional):**
   - *Problema:* Actualmente el usuario puede saltarse teóricamente del módulo 1 al módulo 3. 
   - *Solución:* En `RouteDetails.jsx`, comparar el índice del módulo renderizado con el `progress` o historial del estudiante, y deshabilitar (estilo `opacity-50 pointer-events-none`) los módulos futuros si el módulo anterior no está marcado como aprobado en la DB.

4. **Sanitización de Markdown:**
   - Asegurarse de utilizar plugins como `rehype-sanitize` dentro del `<ReactMarkdown>` para prevenir inyecciones XSS en el caso de que la IA o un atacante logre insertar scripts en el texto.
