/**
 * Dominios de correo permitidos por la plataforma.
 *
 * El backend acepta exactamente dos: el institucional de la EPN y Gmail
 * (`auth.controller.js`, `register`:
 * `normalizedEmail.endsWith('@epn.edu.ec') || normalizedEmail.endsWith('@gmail.com')`).
 *
 * El frontend DEBE permitir los mismos dos. Si se desincronizan aparece un
 * fallo silencioso: el admin crea un usuario con un dominio que el login
 * rechaza, y ese usuario no puede iniciar sesión nunca.
 */

/** Dominios de correo permitidos para registro y creación de usuarios. */
export const ALLOWED_EMAIL_DOMAINS = ['epn.edu.ec', 'gmail.com'] as const;

/** Unión de los dominios permitidos. */
export type AllowedEmailDomain = (typeof ALLOWED_EMAIL_DOMAINS)[number];

/** Los dominios listos para pintar en la UI: `@epn.edu.ec o @gmail.com`. */
export const ALLOWED_EMAIL_DOMAINS_TEXT = ALLOWED_EMAIL_DOMAINS.map(
  (domain) => `@${domain}`
).join(' o ');

/** Mensaje único de error de dominio, compartido por login y panel de admin. */
export const ALLOWED_EMAIL_DOMAIN_ERROR = `Usa un correo institucional (@epn.edu.ec) o de Gmail (@gmail.com)`;

/**
 * Normaliza un correo: recorta los espacios sobrantes y lo pasa a minúsculas.
 *
 * No es cosmético. `User.email` es `TEXT NOT NULL UNIQUE` en SQLite, y SQLite
 * compara TEXT **de forma sensible a mayúsculas**: `Ana@Gmail.com` y
 * `ana@gmail.com` serían dos usuarios distintos. El backend ya normaliza en
 * `register` (`email.trim().toLowerCase()`), así que el frontend normaliza
 * igual para no crear registros que luego no emparejan en el login.
 *
 * @param email - Correo tal como lo escribió el usuario.
 * @returns El correo recortado y en minúsculas.
 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Comprueba si el correo pertenece a uno de los dominios permitidos.
 *
 * La comparación es insensible a mayúsculas y a espacios, y exige el `@`
 * justo antes del dominio: `foo@notepn.edu.ec` NO es institucional.
 *
 * @param email - Correo a comprobar (se normaliza internamente).
 * @returns `true` si el dominio está permitido.
 */
export const isAllowedEmailDomain = (email: string): boolean => {
  const normalized = normalizeEmail(email);
  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
};
