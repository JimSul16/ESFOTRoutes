import { turso } from '../config/turso.js';

export const createResource = async (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const authorId = req.user.id;

    if (!title || !type || !url) {
      return res.status(400).json({ error: 'Título, tipo y URL son obligatorios.' });
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

    const existing = await turso.execute({ sql: `SELECT id FROM Resource WHERE id = ?`, args: [parseInt(id)] });
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Recurso no encontrado.' });
    }

    await turso.execute({
      sql: `UPDATE Resource SET title = ?, description = ?, type = ?, url = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [title, description || null, type, url, parseInt(id)]
    });

    const result = await turso.execute({ sql: `SELECT * FROM Resource WHERE id = ?`, args: [parseInt(id)] });
    return res.status(200).json({ message: 'Recurso actualizado', resource: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar el recurso.' });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await turso.execute({ sql: `SELECT id FROM Resource WHERE id = ?`, args: [parseInt(id)] });
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Recurso no encontrado.' });
    }

    await turso.execute({ sql: `DELETE FROM Resource WHERE id = ?`, args: [parseInt(id)] });
    return res.status(200).json({ message: 'Recurso eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar el recurso.' });
  }
};