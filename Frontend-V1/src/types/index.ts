// ─── User & Auth ──────────────────────────────────────────────────────────────

/**
 * Datos completos del usuario autenticado.
 *
 * Refleja la fila de la tabla `User` que devuelve GET /auth/profile.
 * `initials` e `learningProfile` los persiste el backend (no se derivan en el
 * cliente); `initials` se recalcula en el servidor cada vez que cambia `name`.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  /** Iniciales precalculadas por el backend (columna `User.initials`). */
  initials?: string;
  /** Perfil de aprendizaje serializado como JSON. */
  learningProfile?: string | null;
  profilePicture?: string | null;
  xp?: number;
  level?: number;
  streak?: number;
  nextRankXp?: number;
  isActive?: boolean;
  /** Bloqueo permanente por intentos fallidos (lo usa `GET /admin/users`). */
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Extensión local de User con campos derivados calculados en el dashboard.
 * No viene del backend; se construye en el componente tras obtener el perfil.
 */
export interface UserDashboard extends User {
  primaryRole: 'ADMIN' | 'STUDENT';
}

// ─── Auth (requests / responses) ──────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
  /** OTP de 6 dígitos; solo necesario en el segundo paso del login con 2FA. */
  otp?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

/** Login exitoso (HTTP 200). */
export interface LoginSuccessResponse {
  message: string;
  token: string;
  user: User;
}

/**
 * Login que requiere segundo factor (HTTP 206).
 * El backend no devuelve token todavía: hay que reenviar `credentials` con `otp`.
 */
export interface LoginOtpRequiredResponse {
  message: string;
  token?: undefined;
  user?: undefined;
}

export type LoginResponse = LoginSuccessResponse | LoginOtpRequiredResponse;

/** Respuesta genérica de endpoints que solo devuelven un mensaje. */
export interface AuthMessageResponse {
  message: string;
}

export interface UpdateProfilePayload {
  name?: string;
  profilePicture?: string | null;
  learningProfile?: string | Record<string, unknown>;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  newPassword: string;
}

/** Registro de una sesión de usuario devuelto por /auth/sessions */
export interface SessionEntry {
  id: string;
  email: string;
  role: string;
  ipAddress: string;
  deviceInfo: string;
  status: 'SUCCESS' | 'FAILED' | string;
  loginAt?: string;
  createdAt?: string;
  loginTime?: string;
  date?: string;
  success?: boolean;
}

// ─── Resource ─────────────────────────────────────────────────────────────────

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'PDF' | 'VIDEO' | 'LINK' | 'IMAGE';
  description?: string;
  subject?: string;
  fileUrl?: string;
}

// ─── Learning Route & Modules ─────────────────────────────────────────────────
// Refleja las columnas de `LearningRoute` y `Module`, más los `modules` que
// añade `buildFullRoute()` en el backend.

/** Dificultad acotada por un CHECK en SQLite (incluye 'ADAPTIVE' para rutas generadas por el grafo). */
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ADAPTIVE';

export interface Module {
  id: string;
  title: string;
  description?: string | null;
  /** Orden dentro de la ruta (columna `position`). */
  position?: number;
  routeId?: string;
  completed?: boolean;
  isPassed?: boolean;
  score?: number | null;
  /** El backend hace `JOIN Resource r`, así que son filas completas. */
  resources?: Resource[];
}

export interface Enrollment {
  id: string;
  userId?: string;
  routeId?: string;
  enrolledAt?: string;
  /** Columna `Enrollment.progress`; la escribe `completeModule`. */
  progress?: number;
}

/** `type` del body de `POST /chat/assessment`. */
export type AssessmentType = 'completa' | 'teoria' | 'practica';

/** POST /routes/:id/enroll */
export interface EnrollResponse {
  message: string;
  enrollment?: Enrollment;
}

/**
 * Body de `POST /routes/complete-module`.
 * Ojo: el backend lee `{ moduleId, score, passed }`; `passed` va primero y si
 * es `false` responde 200 sin otorgar XP (no es un error).
 */
export interface CompleteModulePayload {
  moduleId: string;
  score: number;
  passed: boolean;
}

/** POST /routes/complete-module */
export interface CompleteModuleResponse {
  message: string;
  progress: number;
  xpGained: number;
  newTotalXp: number;
  newLevel: number;
}

export interface LearningRoute {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  /**
   * Materia del grafo de conocimiento a la que pertenece la ruta.
   * Valores que usa el backend: 'redes' | 'web' (columna `subjectId`).
   */
  subjectId?: string | null;
  /** Columna `imageUrl` (portada de la ruta). */
  imageUrl?: string | null;
  estimatedTime?: number | null;
  difficulty?: Difficulty;
  /** Prompt maestro con las reglas de evaluación (columna `evaluationRules`). */
  evaluationRules?: string | null;
  isPublic?: boolean | number;
  authorId?: string;
  modules?: Module[];
  /** Solo los añade `GET /routes/my-routes`. */
  enrollments?: Enrollment[];
  /**
   * Avance 0-100. Lo calcula el backend a partir de `ModuleProgress.isPassed`
   * y solo viene en `GET /routes/my-routes`.
   */
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Rutas: forma de escritura ────────────────────────────────────────────────

/**
 * Módulo tal y como lo espera el backend al crear/actualizar una ruta. No es
 * un `Module`: el `id` se ignora (el servidor reinserta) y los recursos van
 * como una lista plana de ids, no como filas.
 */
export interface RouteModuleInput {
  title: string;
  description?: string | null;
  resourceIds?: string[];
}

/** Body de `POST /routes` y `PUT /routes/:id`. */
export interface RoutePayload {
  title: string;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  estimatedTime?: number | null;
  difficulty?: Difficulty;
  evaluationRules?: string | null;
  modules?: RouteModuleInput[];
}

// ─── Graph / Knowledge ────────────────────────────────────────────────────────

/** Materia del grafo con sus conteos. Nombres de campo según Neo4j (knowledgeGraph.service). */
export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  credits?: number;
  moduleCount?: number;
  topicCount?: number;
}

export interface TopicPrerequisite {
  targetId: string;
  strength: 'HARD' | 'SOFT';
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  level?: number;
  difficulty?: number;
  prerequisites?: TopicPrerequisite[];
  resources?: Resource[];
  moduleId?: string;
  moduleName?: string;
}

export interface SelfDiagnosis {
  topicId: string;
  level: number; // 1–5
}

// ─── Graph: formas reales devueltas por Neo4j ─────────────────────────────────
// Ojo: el grafo usa `name`, no `title`, a diferencia de Resource/Topic de arriba.

/** Prerrequisito tal como lo agrega Neo4j en getSubjectTopicsWithPrereqs. */
export interface GraphPrerequisite {
  id: string;
  name: string;
  strength: 'HARD' | 'SOFT';
}

export interface GraphResource {
  id: string;
  title: string;
  url: string;
  type: string;
}

/** Tema dentro de un módulo del grafo. */
export interface GraphTopic {
  id: string;
  name: string;
  description?: string | null;
  difficulty?: number | string | null;
  estimatedMinutes?: number;
  prerequisites?: GraphPrerequisite[];
  resources?: GraphResource[];
}

/** GET /graph/subjects/:id/topics devuelve módulos agrupados, no topics sueltos. */
export interface GraphModule {
  id: string;
  name: string;
  position: number;
  topics: GraphTopic[];
}

/** POST /graph/self-diagnosis */
export interface SelfDiagnosisResult {
  message: string;
  savedCount: number;
}

/** POST /graph/generate-personalized-route */
export interface PersonalizedRouteResult {
  routeId: string | number;
  title: string;
  modules: unknown[];
  summary?: string;
  totalEstimatedMinutes?: number;
}

/** GET /graph/recommendations — materias similares a lo ya completado. */
export interface GraphRecommendation {
  /** id del nodo Subject en Neo4j ('redes' | 'web'). */
  id: string;
  name: string;
  description?: string | null;
  /** Afinidad 0-100 (`SIMILAR_TO.score`). */
  matchScore?: number | null;
  reason?: string | null;
}

/** GET /graph/topic/:topicId/context — subgrafo local inyectado al prompt del chat. */
export interface TopicGraphContext {
  id: string;
  name: string;
  description?: string | null;
  difficulty?: number | string | null;
  subjectName?: string | null;
  moduleName?: string | null;
  prerequisites?: { name: string; strength: 'HARD' | 'SOFT' }[];
  unlocks?: string[];
  resources?: { title: string; url: string; type: string }[];
}

// ─── Chat & Assessment ────────────────────────────────────────────────────────

/**
 * Mensaje del hilo de chat.
 * `sender` usa los mismos valores que la tabla `ChatMessage`: 'STUDENT' y 'AI'
 * (no 'USER', aunque el chat de Gemini lo llame internamente 'user').
 */
export interface ChatMessage {
  sender: 'STUDENT' | 'AI';
  text: string;
  timestamp?: string;
  isGreeting?: boolean;
}

/**
 * Fila de `ChatMessage` tal como la devuelve el backend en `reply`.
 * Ojo: `chat.service` devuelve el objeto completo, no un string suelto.
 */
export interface ChatMessageRow {
  id?: string | number;
  sessionId?: string | number;
  sender?: string;
  content: string;
  createdAt?: string;
}

export interface AssessmentQuestion {
  id: string | number;
  /** El backend lo define como 'multiple_choice' en el prompt de Gemini. */
  type?: string;
  question: string;
  options: string[];
  correctAnswer: string | number;
  explanation?: string;
}

/** Tarea dentro de un reto práctico generado por la IA. */
export interface PracticalTask {
  id: string;
  description: string;
}

export interface PracticalChallenge {
  title: string;
  context?: string;
  tasks: PracticalTask[];
}

/**
 * POST /chat/assessment devuelve el JSON crudo que generó Gemini
 * (`JSON.parse` de la respuesta del modelo), no un sobre con moduleId/type.
 * Según el `type` pedido llega `questions` (teoría/completa) y/o `practicalChallenge`.
 */
export interface AssessmentData {
  questions?: AssessmentQuestion[];
  practicalChallenge?: PracticalChallenge;
}

// ─── Code Execution ───────────────────────────────────────────────────────────

export type SupportedLanguage = 'python' | 'cpp' | 'java' | 'javascript';

export interface ExecuteCodePayload {
  language: SupportedLanguage | string;
  code: string;
  stdin?: string;
}

export interface ExecuteCodeResponse {
  output: string;
  stderr: string;
  code: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SubjectProgress {
  name: string;
  total: number;
  completed: number;
  percent: number;
}

export interface WeeklyActivity {
  day: string;
  minutes: number;
}

export interface ProgressDistribution {
  name: string;
  value: number;
}

export interface AnalyticsData {
  subjectProgress: SubjectProgress[];
  weeklyActivity: WeeklyActivity[];
  progressDistribution: ProgressDistribution[];
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadResponse {
  message: string;
  url: string;
}

export interface CoverUploadResponse {
  mensaje: string;
  url_imagen: string;
}

// ─── Badge / Gamification ─────────────────────────────────────────────────────

export interface UserBadge {
  name: string;
  earned: boolean;
  icon: string;
  description?: string;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

/** Estado genérico para operaciones async dentro de componentes */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Opción de un select o dropdown */
export interface SelectOption {
  value: string;
  label: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}
