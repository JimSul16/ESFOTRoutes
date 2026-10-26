import { jest } from '@jest/globals';
import { Readable } from 'stream';

const mockRes = () => {
  const res = { statusCode: 200, payload: null };
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (j) => { res.payload = j; return res; };
  return res;
};

describe('Cloudinary Upload Service & Controllers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isCloudinaryConfigured', () => {
    test('devuelve false cuando las credenciales están vacías o ausentes', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = '';
      process.env.CLOUDINARY_API_KEY = '';
      process.env.CLOUDINARY_API_SECRET = '';

      const { isCloudinaryConfigured } = await import('../src/services/cloudinary.service.js');
      expect(isCloudinaryConfigured()).toBe(false);
    });

    test('devuelve true cuando las credenciales están presentes y no vacías', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
      process.env.CLOUDINARY_API_KEY = '123456';
      process.env.CLOUDINARY_API_SECRET = 'secret123';

      const { isCloudinaryConfigured } = await import('../src/services/cloudinary.service.js');
      expect(isCloudinaryConfigured()).toBe(true);
    });
  });

  describe('uploadFile controller', () => {
    test('rechaza si no se proporciona req.file', async () => {
      const { uploadFile } = await import('../src/controllers/upload.controller.js');
      const req = { file: undefined };
      const res = mockRes();

      await uploadFile(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/No se proporcionó ningún archivo/);
    });

    test('devuelve 503 explicativo si Cloudinary no está configurado', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = '';
      process.env.CLOUDINARY_API_KEY = '';
      process.env.CLOUDINARY_API_SECRET = '';

      const { uploadFile } = await import('../src/controllers/upload.controller.js');
      const req = {
        file: {
          mimetype: 'application/pdf',
          originalname: 'guia.pdf',
          buffer: Buffer.from('%PDF-1.4 test')
        }
      };
      const res = mockRes();

      await uploadFile(req, res);
      expect(res.statusCode).toBe(503);
      expect(res.payload.error).toMatch(/El servicio de Cloudinary no está configurado/);
    });

    test('sube PDF exitosamente configurando format pdf en Cloudinary', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-key';
      process.env.CLOUDINARY_API_SECRET = 'test-secret';

      const { uploadFile } = await import('../src/controllers/upload.controller.js');
      const { cloudinary } = await import('../src/services/cloudinary.service.js');

      let capturedOptions = null;
      const originalUploadStream = cloudinary.uploader.upload_stream;
      cloudinary.uploader.upload_stream = jest.fn((options, callback) => {
        capturedOptions = options;
        const stream = new Readable({
          read() {}
        });
        // Simulamos writable stream
        stream._write = (chunk, encoding, next) => next();
        stream.end = () => {
          callback(null, { secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/esfot-resources/guia.pdf' });
        };
        return stream;
      });

      const req = {
        file: {
          mimetype: 'application/pdf',
          originalname: 'guia-estudio.pdf',
          buffer: Buffer.from('%PDF-1.4 test')
        }
      };
      const res = mockRes();

      await uploadFile(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.url).toBe('https://res.cloudinary.com/test-cloud/image/upload/v1/esfot-resources/guia.pdf');
      expect(capturedOptions.format).toBe('pdf');
      expect(capturedOptions.resource_type).toBe('auto');

      cloudinary.uploader.upload_stream = originalUploadStream;
    });
  });

  describe('uploadProfilePicture controller', () => {
    test('rechaza si no se proporciona req.file', async () => {
      const { uploadProfilePicture } = await import('../src/controllers/upload.controller.js');
      const req = { file: undefined, user: { id: 1 } };
      const res = mockRes();

      await uploadProfilePicture(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/No se detectó ninguna imagen/);
    });

    test('devuelve 503 explicativo si Cloudinary no está configurado', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = '';
      process.env.CLOUDINARY_API_KEY = '';
      process.env.CLOUDINARY_API_SECRET = '';

      const { uploadProfilePicture } = await import('../src/controllers/upload.controller.js');
      const req = {
        file: {
          mimetype: 'image/png',
          originalname: 'avatar.png',
          buffer: Buffer.from('fake-image-bytes')
        },
        user: { id: 1 }
      };
      const res = mockRes();

      await uploadProfilePicture(req, res);
      expect(res.statusCode).toBe(503);
      expect(res.payload.error).toMatch(/El servicio de Cloudinary no está configurado/);
    });

    test('sube foto de perfil y actualiza base de datos', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-key';
      process.env.CLOUDINARY_API_SECRET = 'test-secret';

      const { uploadProfilePicture } = await import('../src/controllers/upload.controller.js');
      const { cloudinary } = await import('../src/services/cloudinary.service.js');
      const { turso } = await import('../src/config/turso.js');

      const originalTursoExecute = turso.execute;
      let dbUpdated = null;
      turso.execute = jest.fn(async (query) => {
        dbUpdated = query;
        return { rows: [] };
      });

      const originalUploadStream = cloudinary.uploader.upload_stream;
      cloudinary.uploader.upload_stream = jest.fn((options, callback) => {
        const stream = new Readable({ read() {} });
        stream._write = (chunk, encoding, next) => next();
        stream.end = () => {
          callback(null, { secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/epn_profiles/user_42.jpg' });
        };
        return stream;
      });

      const req = {
        file: {
          mimetype: 'image/jpeg',
          originalname: 'mifoto.jpg',
          buffer: Buffer.from('image-bytes')
        },
        user: { id: 42 }
      };
      const res = mockRes();

      await uploadProfilePicture(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.url).toBe('https://res.cloudinary.com/test-cloud/image/upload/v1/epn_profiles/user_42.jpg');
      expect(dbUpdated).toBeTruthy();
      expect(dbUpdated.args).toEqual(['https://res.cloudinary.com/test-cloud/image/upload/v1/epn_profiles/user_42.jpg', 42]);

      turso.execute = originalTursoExecute;
      cloudinary.uploader.upload_stream = originalUploadStream;
    });
  });

  describe('subirPortadaRuta controller', () => {
    test('rechaza si no se proporciona req.file', async () => {
      const { subirPortadaRuta } = await import('../src/controllers/upload.controller.js');
      const req = { file: undefined };
      const res = mockRes();

      await subirPortadaRuta(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toMatch(/No se recibió ninguna imagen/);
    });

    test('devuelve 503 explicativo si Cloudinary no está configurado', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = '';
      process.env.CLOUDINARY_API_KEY = '';
      process.env.CLOUDINARY_API_SECRET = '';

      const { subirPortadaRuta } = await import('../src/controllers/upload.controller.js');
      const req = {
        file: {
          mimetype: 'image/png',
          originalname: 'portada.png',
          buffer: Buffer.from('fake-image-bytes')
        }
      };
      const res = mockRes();

      await subirPortadaRuta(req, res);
      expect(res.statusCode).toBe(503);
      expect(res.payload.error).toMatch(/El servicio de Cloudinary no está configurado/);
    });

    test('sube portada exitosamente', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-key';
      process.env.CLOUDINARY_API_SECRET = 'test-secret';

      const { subirPortadaRuta } = await import('../src/controllers/upload.controller.js');
      const { cloudinary } = await import('../src/services/cloudinary.service.js');

      const originalUploadStream = cloudinary.uploader.upload_stream;
      cloudinary.uploader.upload_stream = jest.fn((options, callback) => {
        const stream = new Readable({ read() {} });
        stream._write = (chunk, encoding, next) => next();
        stream.end = () => {
          callback(null, { secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/esfot-rutas/portada.png' });
        };
        return stream;
      });

      const req = {
        file: {
          mimetype: 'image/png',
          originalname: 'portada.png',
          buffer: Buffer.from('fake-image-bytes')
        }
      };
      const res = mockRes();

      await subirPortadaRuta(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.url_imagen).toBe('https://res.cloudinary.com/test-cloud/image/upload/v1/esfot-rutas/portada.png');

      cloudinary.uploader.upload_stream = originalUploadStream;
    });
  });

  describe('Multer fileFilter validation', () => {
    test('upload middleware acepta PDF e imágenes', async () => {
      const { upload } = await import('../src/middlewares/upload.middleware.js');
      const filter = upload.fileFilter;

      const pdfCb = jest.fn();
      filter({}, { mimetype: 'application/pdf' }, pdfCb);
      expect(pdfCb).toHaveBeenCalledWith(null, true);

      const pngCb = jest.fn();
      filter({}, { mimetype: 'image/png' }, pngCb);
      expect(pngCb).toHaveBeenCalledWith(null, true);

      const jpgCb = jest.fn();
      filter({}, { mimetype: 'image/jpeg' }, jpgCb);
      expect(jpgCb).toHaveBeenCalledWith(null, true);

      const invalidCb = jest.fn();
      filter({}, { mimetype: 'application/x-msdownload' }, invalidCb);
      expect(invalidCb).toHaveBeenCalledWith(expect.any(Error));
    });

    test('uploadCloudinary middleware solo acepta imágenes', async () => {
      const { uploadCloudinary } = await import('../src/services/cloudinary.service.js');
      const filter = uploadCloudinary.fileFilter;

      const pngCb = jest.fn();
      filter({}, { mimetype: 'image/png' }, pngCb);
      expect(pngCb).toHaveBeenCalledWith(null, true);

      const pdfCb = jest.fn();
      filter({}, { mimetype: 'application/pdf' }, pdfCb);
      expect(pdfCb).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
