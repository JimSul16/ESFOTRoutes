import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1000 }
});

/**
 * Multer para subir **material de estudio** (PDF / texto) al generador de
 * rutas con IA.
 *
 * Antes este endpoint usaba `uploadCloudinary`, cuyo `fileFilter` solo
 * acepta imágenes (JPG/PNG/WEBP): subir un PDF devolvía 400 y la función
 * "generar una ruta a partir de un PDF" **nunca funcionó**.
 */
export const uploadMaterial = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1000 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Formato no permitido. Se admiten PDF, TXT, MD o DOCX.'));
  },
});

/**
 * Traduce los errores de multer a respuestas JSON.
 *
 * Sin este middleware, un archivo que no encaja (tipo no permitido, tamaño
 * máximo superado) provoca que multer conteste con un **400 en texto plano**,
 * mientras que el resto de la API responde JSON. El cliente (y el
 * `getApiErrorMessage` del frontend) no puede leerlo.
 *
 * Se usa como handler de error justo después del middleware de multer.
 */
export const handleUploadError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: 'El archivo supera el tamaño máximo permitido (5 MB).',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado en la petición.',
      LIMIT_FILE_COUNT: 'Se han enviado demasiados archivos.',
    };

    return res.status(400).json({
      success: false,
      error: mensajes[err.code] || `Error de subida: ${err.message}`,
      code: err.code,
    });
  }

  if (err) {
    // Errores de validación propios (p. ej. "solo se admite PDF").
    const status = err.status || 400;
    return res.status(status).json({
      success: false,
      error: err.message || 'Error al procesar el archivo.',
    });
  }

  return next();
};
