/**
 * Utilidades compartidas del backend.
 */

/**
 * Convierte un `:id` de la URL en un entero válido de recurso.
 *
 * `parseInt('abc')` devuelve `NaN`, y libSQL/Turso **no puede enlazar `NaN`**:
 * la consulta revienta con "Only finite numbers (not Infinity or NaN) can be
 * passed as arguments" y el endpoint respondía 500 en lugar de 400.
 *
 * @param {unknown} raw  El valor crudo del parámetro de ruta.
 * @returns {number|null} El id, o `null` si no es un entero positivo.
 */
export const parseId = (raw) => {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Escapa el texto que se va a interpolar en HTML.
 *
 * Sin esto, un parámetro de la URL controlado por el usuario se convierte en
 * HTML ejecutable (XSS reflejado). El `escapeHtml` que ya existía dentro de
 * `unlockAccountViaToken` se generaliza aquí para poder reutilizarlo.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (match) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return entities[match];
  });
};

/**
 * Comprueba que un string sea un correo con formato válido.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export const isValidEmail = (value) =>
  typeof value === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
