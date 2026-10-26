import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Nota sobre TypeScript: los archivos `.ts` / `.tsx` están fuera del alcance de
 * este config porque el proyecto usa TypeScript 7 (tsgo) y `typescript-eslint`
 * declara `typescript: >=4.8.4 <6.1.0` como peer dependency, tanto en `latest`
 * (8.71.1) como en `canary`. Hasta que exista soporte, espree no puede parsear
 * la sintaxis TS.
 *
 * Para reactivarlo hay dos caminos:
 *   1. Bajar TypeScript a la rama 5.x, o
 *   2. Esperar a que typescript-eslint soporte TS 7.
 *
 * ── MIENTRAS TANTO ──────────────────────────────────────────────────────────
 * El lint del código de la aplicación lo hace **oxlint** (`npm run lint` →
 * `eslint . && oxlint`), que parsea TypeScript de forma nativa y cubre los
 * 92 ficheros de `src/` con las reglas de `react`, `react-hooks` y `jsx-a11y`.
 * Este config de ESLint solo cubre los ficheros de configuración de la raíz
 * (que sí son JavaScript plano).
 */
export default [
  { ignores: ['dist', 'node_modules', 'index_test_auth.html'] },

  // ── Configs de build en la raíz ───────────────────────────────────────────
  {
    files: ['*.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
  {
    files: ['*.config.cjs'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },

  // ── Código de la app ──────────────────────────────────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // `catch (e) {}` sin usar es JS idiomático y no merece ruido.
      'no-unused-vars': ['error', { caughtErrors: 'none', ignoreRestSiblings: true }],
      // Un catch vacío es válido cuando la UI ya notifica el error por otra vía.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // ── Degradadas a warning a propósito ──────────────────────────────────
      // Son reglas de la capa de React Compiler (eslint-plugin-react-hooks v7)
      // quetenseñan código que hoy funciona, y corregirlas exige un refactor
      // arquitectónico (mover la carga de datos fuera de los effects) que está
      // planificado para las Fases 5A/5B.
      //
      // El caso de AuthProvider ya se resolvió en la Fase 2: ahora hidrata
      // desde sessionStorage con un inicializador lazy de useState, en vez de
      // setState dentro de un effect. Las 5 ocurrencias restantes son el patrón
      // "cargar datos al montar" en ResourcesManager, RoutesManager,
      // UsersManager, CodeWorkspace y RouteDetails.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];