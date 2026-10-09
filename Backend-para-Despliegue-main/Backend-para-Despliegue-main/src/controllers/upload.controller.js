import { cloudinary } from '../services/cloudinary.service.js';
import { turso } from '../config/turso.js';
import multer from 'multer';

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Sólo se permiten archivos PDF.'));
    }
  }
}).single('file');

export const uploadFile = (req, res) => {
  uploadPdf(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo.' });
      }

      // Additional fallback checks in case another middleware consumed the stream
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Sólo se permiten archivos PDF.' });
      }
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'El archivo excede el límite de 5MB.' });
      }

      // Subir a Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'esfot-resources' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const result = await uploadPromise;

      return res.status(200).json({
        message: 'Archivo subido con éxito',
        url: result.secure_url
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error al subir el archivo.' });
    }
  });
};

export const subirPortadaRuta = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: 'esfot-rutas' },
    (error, result) => {
      if (error) return res.status(500).json({ error: 'Error al subir a Cloudinary' });
      res.status(200).json({ mensaje: 'Portada subida con éxito', url_imagen: result.secure_url });
    }
  );

  stream.end(req.file.buffer);
};

export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se detectó ninguna imagen en la petición.' });
    }

    const userId = req.user.id;

    const uploadPromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'epn_profiles',
          transformation: [{ width: 500, height: 500, crop: 'fill' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    await turso.execute({
      sql: `UPDATE User SET profilePicture = ?, updatedAt = datetime('now') WHERE id = ?`,
      args: [result.secure_url, userId]
    });

    return res.status(200).json({
      message: 'Foto de perfil actualizada exitosamente.',
      url: result.secure_url
    });
  } catch (error) {
    return res.status(500).json({ error: 'Fallo interno al procesar la imagen con Cloudinary.' });
  }
};