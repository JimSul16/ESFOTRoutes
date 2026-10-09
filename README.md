<div align="center">
  <img src="https://img.icons8.com/color/120/000000/brain-train.png" alt="ESFOT AI Learning Logo"/>
  <h1>🧠 Plataforma de Rutas de Aprendizaje ESFOT</h1>
  <p><em>Plataforma educativa potenciada por Inteligencia Artificial, Grafos de Conocimiento y Entornos de Código en Vivo.</em></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" />
    <img src="https://img.shields.io/badge/Neo4j-018bff?style=for-the-badge&logo=neo4j&logoColor=white" alt="Neo4j" />
    <img src="https://img.shields.io/badge/Turso-000000?style=for-the-badge&logo=sqlite&logoColor=white" alt="Turso" />
    <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  </p>
</div>

## 📖 Descripción del Proyecto
La **Plataforma ESFOT** permite la generación de **Rutas de Aprendizaje Personalizadas** mediante Inteligencia Artificial. Los estudiantes pueden aprender conceptos teóricos adaptables, interactuar con un Chatbot Tutor (IA), realizar prácticas de código en tiempo real y ser evaluados de manera dinámica. Todo el progreso se almacena de forma relacional y se mapea en un **Grafo de Conocimiento** para futuras recomendaciones y visualización de logros.

---

## ✨ Características Principales
- 🤖 **Rutas Impulsadas por IA:** Generación de módulos de estudio a partir de documentos PDF o temarios usando *Google Gemini AI*.
- 📊 **Progreso en Grafos:** Integración con *Neo4j* para mapear la trayectoria del conocimiento `(Usuario)-[:COMPLETED]->(Módulo)`.
- 💻 **IDE Integrado:** Entorno interactivo con *Monaco Editor* para practicar código (JavaScript, Python, entre otros).
- ⚡ **Evaluaciones Dinámicas con Caché:** Cuestionarios y retos prácticos creados por IA al instante, cacheados inteligentemente en *Turso SQLite* para extremo rendimiento.
- ☁️ **Subida Segura en la Nube:** Integración optimizada con *Cloudinary* para la manipulación de PDFs e imágenes.

---

## 🏗️ Arquitectura del Sistema

```mermaid
graph TD
    %% Frontend
    subgraph Frontend [Cliente - React & Vite]
        UI[User Interface / Vistas]
        State[Zustand Store]
        IDE[Monaco Editor]
    end

    %% Backend
    subgraph Backend [Servidor - Node.js & Express]
        API[API Endpoints]
        Auth[JWT & Autenticación]
        RoutesCtrl[Gestor de Rutas y Archivos]
        AICtrl[Controlador de Chat & IA]
    end

    %% External Services
    subgraph Servicios Externos
        Gemini[Google Gemini API]
        Cloudinary[Cloudinary CDN]
        JDoodle[JDoodle Compiler]
    end

    %% Databases
    subgraph Bases de Datos
        Turso[(Turso SQLite<br>Perfil & Caché)]
        Neo4j[(Neo4j AuraDB<br>Knowledge Graph)]
    end

    %% Conexiones
    UI <-->|HTTP / REST| API
    API --> Auth
    API --> RoutesCtrl
    API --> AICtrl

    RoutesCtrl --> Turso
    RoutesCtrl --> Neo4j
    RoutesCtrl --> Cloudinary
    
    AICtrl -->|Generación de Cuestionarios| Gemini
    AICtrl -->|Búsqueda de caché| Turso
    IDE -->|Compilación Remota| JDoodle
```

---

## 🛠️ Tecnologías Usadas

### Frontend
- **Framework:** React 19 + Vite
- **Estilos:** Tailwind CSS v4
- **Manejo de Estado:** Zustand
- **Formularios:** React Hook Form + Zod
- **Extras:** React Router DOM, React Markdown, React Toastify

### Backend
- **Entorno:** Node.js + Express
- **Bases de Datos:** Turso (SQLite Remoto), Neo4j (Base de Datos Orientada a Grafos)
- **Seguridad:** JWT (JSON Web Tokens), Bcrypt, Multer Limits
- **Manejo de Archivos:** Cloudinary SDK

---

## 🚀 Instalación y Despliegue Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/tu-repositorio.git
cd tu-repositorio
```

### 2. Configurar el Backend
```bash
cd Backend-para-Despliegue-main/Backend-para-Despliegue-main
npm install
```
Asegúrate de configurar el archivo `.env` en base a lo documentado en `DOCUMENTACION_OFICIAL.md`. Luego, inicia el servidor:
```bash
npm run dev
```

### 3. Configurar el Frontend
Abre una nueva terminal en la raíz de tu proyecto:
```bash
cd Frontend
npm install
```
Verifica que tu archivo `.env` local contenga `VITE_API_URL=http://localhost:3000/api` y arranca Vite:
```bash
npm run dev
```

---

## 📝 Documentación Completa
Para ver el detalle profundo de la arquitectura, variables de entorno completas, seguridad, listado de tareas pendientes y endpoints, revisa el archivo [`DOCUMENTACION_OFICIAL.md`](./DOCUMENTACION_OFICIAL.md) incluido en la raíz de este proyecto.

<div align="center">
  <i>Desarrollado para ESFOT</i>
</div>
