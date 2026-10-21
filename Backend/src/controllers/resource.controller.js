import { turso } from '../config/turso.js';
import { parseId } from '../utils/index.js';

export const createResource = async (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const authorId = req.user.id;

    if (!title || !type || !url) {
      return res.status(400).json({ error: 'Título, tipo y URL son obligatorios.' });
    }

    // El `type` tiene un CHECK en SQLite: sin validarlo, un valor inválido
    // reventaba con un 500 de constraint en vez de un 400 con mensaje claro.
    const ALLOWED_TYPES = ['LINK', 'PDF', 'VIDEO', 'IMAGE', 'DOCUMENT'];
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Tipo no válido. Valores admitidos: ${ALLOWED_TYPES.join(', ')}.`
      });
    }

    await turso.execute({
      sql: `INSERT INTO Resource (title, description, type, url, authorId) VALUES (?, ?, ?, ?, ?)`,
      args: [title, description || null, type, url, authorId]
    });

    const result = await turso.execute({
      sql: `SELECT * FROM Resource WHERE url = ? AND authorId = ? ORDER BY id DESC LIMIT 1`,
      args: [url, authorId]
    });

    return res.status(201).json({ message: 'Recurso creado exitosamente', resource: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear el recurso.' });
  }
};

export const getResources = async (req, res) => {
  try {
    const result = await turso.execute(
      `SELECT r.*, u.name as authorName, u.email as authorEmail
       FROM Resource r
       JOIN User u ON u.id = r.authorId
       ORDER BY r.createdAt DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener los recursos.' });
  }
};

export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, url } = req.body;

    const resourceId = parseId(id);
    if (resourceId === null) {
      return res.status(400).json({ error: 'El identificador del recurso no es válido.' });
    }

    const existing = await turso.execute({ sql: `SELECT id FROM Resource WHERE id = ?`, args: [resourceId] });
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Recurso no encontrado.' });
    }

    const ALLOWED_TYPES = ['LINK', 'PDF', 'VIDEO', 'IMAGE', 'DOCUMENT'];
    if (type && !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Tipo no válido. Valores admitidos: ${ALLOWED_TYPES.join(', ')}.`
      });
    }

    await turso.execute({
      sql: `UPDATE Resource SET title = ?, description = ?, type = ?, url = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [title, description || null, type, url, resourceId]
    });

    const result = await turso.execute({ sql: `SELECT * FROM Resource WHERE id = ?`, args: [resourceId] });
    return res.status(200).json({ message: 'Recurso actualizado', resource: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el recurso.' });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resourceId = parseId(id);
    if (resourceId === null) {
      return res.status(400).json({ error: 'El identificador del recurso no es válido.' });
    }

    const existing = await turso.execute({ sql: `SELECT id FROM Resource WHERE id = ?`, args: [resourceId] });
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Recurso no encontrado.' });
    }

    await turso.execute({ sql: `DELETE FROM Resource WHERE id = ?`, args: [resourceId] });
    return res.status(200).json({ message: 'Recurso eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el recurso.' });
  }
};