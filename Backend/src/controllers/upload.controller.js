import path from 'path';
import { cloudinary, isCloudinaryConfigured } from '../services/cloudinary.service.js';
import { turso } from '../config/turso.js';

const CLOUDINARY_NOT_CONFIGURED_MSG =
  'El servicio de Cloudinary no está configurado en el servidor. Por favor configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el archivo .env.';

/**
 * Sube un archivo (PDF o Imagen) a Cloudinary para recursos educativos.
 * Middleware previo: upload.single('file')
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo.' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: CLOUDINARY_NOT_CONFIGURED_MSG });
    }

    const isPdf = req.file.mimetype === 'application/pdf';
    const parsedName = path.parse(req.file.originalname || 'recurso');
    const cleanBaseName = parsedName.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const uniquePublicId = `${Date.now()}_${cleanBaseName || 'archivo'}`;

    // Para PDFs en Cloudinary es crucial indicar resource_type 'auto' y format 'pdf'
    // para que la URL final mantenga la extensión y se pueda visualizar/descargar correctamente.
    const uploadOptions = {
      folder: 'esfot-resources',
      resource_type: 'auto',
      public_id: uniquePublicId,
      ...(isPdf ? { format: 'pdf' } : {})
    };

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.on('error', reject);
      stream.end(req.file.buffer);
    });

    return res.status(200).json({
      message: 'Archivo subido con éxito',
      url: result.secure_url
    });
  } catch (error) {
    console.error('Error al subir archivo a Cloudinary:', error);
    return res.status(500).json({
      error: 'Error al subir el archivo a Cloudinary: ' + (error.message || 'Error desconocido')
    });
  }
};

/**
 * Sube la portada de una ruta de aprendizaje a Cloudinary.
 * Middleware previo: uploadCloudinary.single('portada')
 */
export const subirPortadaRuta = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: CLOUDINARY_NOT_CONFIGURED_MSG });
    }

    const parsedName = path.parse(req.file.originalname || 'portada');
    const cleanBaseName = parsedName.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const uniquePublicId = `${Date.now()}_${cleanBaseName || 'portada'}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'esfot-rutas',
          resource_type: 'image',
          public_id: uniquePublicId
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.on('error', reject);
      stream.end(req.file.buffer);
    });

    return res.status(200).json({
      mensaje: 'Portada subida con éxito',
      url_imagen: result.secure_url
    });
  } catch (error) {
    console.error('Error al subir portada a Cloudinary:', error);
    return res.status(500).json({
      error: 'Error al subir a Cloudinary: ' + (error.message || 'Error desconocido')
    });
  }
};

/**
 * Sube la foto de perfil del usuario autenticado a Cloudinary y actualiza Turso.
 * Middleware previo: uploadCloudinary.single('image')
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se detectó ninguna imagen en la petición.' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: CLOUDINARY_NOT_CONFIGURED_MSG });
    }

    const rawId = req.user?.id || req.user?.userId || req.user?.sub;
    const userId = parseInt(rawId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ error: 'Usuario no autenticado o ID inválido en el token.' });
    }

    const uniquePublicId = `user_${userId}_${Date.now()}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'epn_profiles',
          resource_type: 'image',
          public_id: uniquePublicId,
          transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.on('error', reject);
      stream.end(req.file.buffer);
    });

    await turso.execute({
      sql: `UPDATE User SET profilePicture = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [result.secure_url, userId]
    });

    return res.status(200).json({
      message: 'Foto de perfil actualizada exitosamente.',
      url: result.secure_url
    });
  } catch (error) {
    console.error('Error al subir foto de perfil a Cloudinary:', error);
    return res.status(500).json({
      error: 'Fallo interno al procesar la imagen con Cloudinary: ' + (error.message || 'Error desconocido')
    });
  }
};
