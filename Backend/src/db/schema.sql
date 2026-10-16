-- ╔══════════════════════════════════════════════════════════════╗
-- ║   ESFOT - Sistema de Rutas de Aprendizaje                    ║
-- ║   Schema SQL para Turso (SQLite compatible)                  ║
-- ╚══════════════════════════════════════════════════════════════╝

PRAGMA foreign_keys = ON;

-- ─── ROLES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Role (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── PERMISOS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Permission (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── USUARIOS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS User (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  email             TEXT    NOT NULL UNIQUE,
  password          TEXT    NOT NULL,
  profilePicture    TEXT,
  initials          TEXT,
  streak            INTEGER NOT NULL DEFAULT 0,
  level             INTEGER NOT NULL DEFAULT 1,
  xp                INTEGER NOT NULL DEFAULT 0,
  learningProfile   TEXT,
  isVerified        INTEGER NOT NULL DEFAULT 0,
  isActive          INTEGER NOT NULL DEFAULT 1,
  verificationToken TEXT,
  resetToken        TEXT,
  otpCode           TEXT,
  otpExpiresAt      TEXT,
  failedAttempts    INTEGER NOT NULL DEFAULT 0,
  lockoutUntil      TEXT,
  lockoutCount      INTEGER NOT NULL DEFAULT 0,
  isLocked          INTEGER NOT NULL DEFAULT 0,
  unlockToken       TEXT,
  createdAt         TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── RELACION USUARIO-ROL ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS UserRole (
  userId     INTEGER NOT NULL,
  roleId     INTEGER NOT NULL,
  assignedAt TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (userId, roleId),
  FOREIGN KEY (userId) REFERENCES User(id)  ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES Role(id)  ON DELETE CASCADE
);

-- ─── RELACION ROL-PERMISO ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS RolePermission (
  roleId       INTEGER NOT NULL,
  permissionId INTEGER NOT NULL,
  assignedAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (roleId, permissionId),
  FOREIGN KEY (roleId)       REFERENCES Role(id)       ON DELETE CASCADE,
  FOREIGN KEY (permissionId) REFERENCES Permission(id) ON DELETE CASCADE
);

-- ─── RECURSOS EDUCATIVOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Resource (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT,
  type        TEXT    NOT NULL CHECK(type IN ('LINK','PDF','VIDEO','IMAGE','DOCUMENT')),
  url         TEXT    NOT NULL,
  authorId    INTEGER NOT NULL,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (authorId) REFERENCES User(id)
);

-- ─── RUTAS DE APRENDIZAJE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS LearningRoute (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  description     TEXT,
  category        TEXT,
  subjectId       TEXT,
  imageUrl        TEXT,
  estimatedTime   INTEGER,
  difficulty      TEXT    NOT NULL DEFAULT 'BEGINNER' CHECK(difficulty IN ('BEGINNER','INTERMEDIATE','ADVANCED','ADAPTIVE')),
  evaluationRules TEXT,
  isPublic        INTEGER NOT NULL DEFAULT 1,
  authorId        INTEGER NOT NULL,
  createdAt       TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (authorId) REFERENCES User(id)
);

-- ─── MÓDULOS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Module (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL,
  routeId     INTEGER NOT NULL,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (routeId) REFERENCES LearningRoute(id) ON DELETE CASCADE
);

-- ─── RELACION MODULO-RECURSO ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ModuleResource (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  moduleId   INTEGER NOT NULL,
  resourceId INTEGER NOT NULL,
  position   INTEGER NOT NULL,
  UNIQUE(moduleId, resourceId),
  FOREIGN KEY (moduleId)   REFERENCES Module(id)   ON DELETE CASCADE,
  FOREIGN KEY (resourceId) REFERENCES Resource(id) ON DELETE CASCADE
);

-- ─── SESIONES DE CHAT ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ChatSession (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL,
  moduleId  INTEGER,
  title     TEXT,
  topic     TEXT,
  createdAt TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId)   REFERENCES User(id)   ON DELETE CASCADE,
  FOREIGN KEY (moduleId) REFERENCES Module(id) ON DELETE SET NULL
);

-- ─── MENSAJES DE CHAT ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ChatMessage (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId   INTEGER NOT NULL,
  sender      TEXT    NOT NULL CHECK(sender IN ('STUDENT','AI')),
  content     TEXT    NOT NULL,
  fileUrl     TEXT,
  isChallenge INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sessionId) REFERENCES ChatSession(id) ON DELETE CASCADE
);

-- ─── INSCRIPCIONES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Enrollment (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  userId          INTEGER NOT NULL,
  learningRouteId INTEGER NOT NULL,
  progress        INTEGER NOT NULL DEFAULT 0,
  createdAt       TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(userId, learningRouteId),
  FOREIGN KEY (userId)          REFERENCES User(id)          ON DELETE CASCADE,
  FOREIGN KEY (learningRouteId) REFERENCES LearningRoute(id) ON DELETE CASCADE
);

-- ─── PROGRESO DE MÓDULOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ModuleProgress (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  userId      INTEGER NOT NULL,
  moduleId    INTEGER NOT NULL,
  isPassed    INTEGER NOT NULL DEFAULT 0,
  score       INTEGER,
  completedAt TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(userId, moduleId),
  FOREIGN KEY (userId)   REFERENCES User(id)   ON DELETE CASCADE,
  FOREIGN KEY (moduleId) REFERENCES Module(id) ON DELETE CASCADE
);

-- ─── REGISTRO DE AUDITORÍA DE SESIONES ────────────────────────────
CREATE TABLE IF NOT EXISTS UserSessionLog (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  userId      INTEGER NOT NULL,
  email       TEXT    NOT NULL,
  role        TEXT    NOT NULL,
  ipAddress   TEXT    NOT NULL,
  deviceInfo  TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'SUCCESS',
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

-- ─── EVALUACIONES DE MÓDULOS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ModuleAssessment (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  moduleId    INTEGER NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'completa',
  content     TEXT    NOT NULL,
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moduleId) REFERENCES Module(id) ON DELETE CASCADE
);
