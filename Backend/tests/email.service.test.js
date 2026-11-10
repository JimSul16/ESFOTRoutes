import { jest } from '@jest/globals';

describe('email.service — Multi-proveedor y resiliencia en producción', () => {
  const originalEnv = { ...process.env };
  let emailService;

  beforeAll(async () => {
    emailService = await import('../src/services/email.service.js');
  });

  beforeEach(() => {
    delete process.env.MAIL_WEBHOOK_URL;
    delete process.env.BREVO_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.RENDER;
  });

  afterAll(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe('getFrontendUrl', () => {
    it('devuelve el valor por defecto si FRONTEND_URL no está definido', () => {
      delete process.env.FRONTEND_URL;
      expect(emailService.getFrontendUrl()).toBe('http://localhost:5173');
    });

    it('limpia barras finales y comillas', () => {
      process.env.FRONTEND_URL = '"https://tic-rutas-aprendizaje.vercel.app/"';
      expect(emailService.getFrontendUrl()).toBe('https://tic-rutas-aprendizaje.vercel.app');
    });

    it('toma el primer origen si hay múltiples URLs separadas por coma', () => {
      process.env.FRONTEND_URL = 'https://tic-rutas-aprendizaje.vercel.app, https://esfotroutes.vercel.app';
      expect(emailService.getFrontendUrl()).toBe('https://tic-rutas-aprendizaje.vercel.app');
    });

    it('corrige automáticamente esfotroutes.vercel.app a tic-rutas-aprendizaje.vercel.app', () => {
      process.env.FRONTEND_URL = 'https://esfotroutes.vercel.app';
      expect(emailService.getFrontendUrl()).toBe('https://tic-rutas-aprendizaje.vercel.app');
    });

    it('en entorno Render o producción usa el dominio oficial de Vercel si FRONTEND_URL es localhost o vacía', () => {
      process.env.RENDER = 'true';
      delete process.env.FRONTEND_URL;
      expect(emailService.getFrontendUrl()).toBe('https://tic-rutas-aprendizaje.vercel.app');

      process.env.FRONTEND_URL = 'http://localhost:5173';
      expect(emailService.getFrontendUrl()).toBe('https://tic-rutas-aprendizaje.vercel.app');
    });
  });

  describe('sendEmail con Webhook HTTPS (Google Apps Script)', () => {
    it('envía correctamente a través del webhook HTTPS', async () => {
      process.env.MAIL_WEBHOOK_URL = 'https://script.google.com/macros/s/test/exec';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      globalThis.fetch = mockFetch;

      const result = await emailService.sendEmail({
        to: 'estudiante@epn.edu.ec',
        subject: 'Prueba Webhook',
        html: '<p>Hola</p>',
      });

      expect(result.ok).toBe(true);
      expect(result.messageId).toBe('webhook-ok');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://script.google.com/macros/s/test/exec',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('sendEmail con Brevo API (HTTPS)', () => {
    it('envía correctamente usando la API REST de Brevo en el puerto 443', async () => {
      process.env.BREVO_API_KEY = 'test-brevo-key';
      process.env.BREVO_SENDER_EMAIL = 'remitente@epn.edu.ec';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: '<brevo-123@smtp-relay.mailin.fr>' }),
      });
      globalThis.fetch = mockFetch;

      const result = await emailService.sendEmail({
        to: 'estudiante@epn.edu.ec',
        subject: 'Prueba Brevo',
        html: '<p>Hola</p>',
      });

      expect(result.ok).toBe(true);
      expect(result.messageId).toBe('<brevo-123@smtp-relay.mailin.fr>');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': 'test-brevo-key',
          }),
        })
      );
    });
  });

  describe('sendEmail en entorno Render sin proveedor HTTPS', () => {
    it('falla rápido y NO congela el socket SMTP con timeout en Render', async () => {
      delete process.env.BREVO_API_KEY;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.RESEND_API_KEY;
      process.env.RENDER = 'true';

      const result = await emailService.sendEmail({
        to: 'estudiante@epn.edu.ec',
        subject: 'Prueba',
        html: '<p>Hola</p>',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('puertos SMTP (25, 465, 587) están bloqueados en Render');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('genera el enlace con getFrontendUrl y retorna el resultado de sendEmail', async () => {
      process.env.FRONTEND_URL = 'https://tic-rutas-aprendizaje.vercel.app';
      process.env.BREVO_API_KEY = 'test-key';

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: 'reset-msg-123' }),
      });

      const res = await emailService.sendPasswordResetEmail('estudiante@epn.edu.ec', 'Juan', 'token-abc');
      expect(res.ok).toBe(true);
      expect(res.messageId).toBe('reset-msg-123');
    });
  });

  describe('sendVerificationEmail', () => {
    it('genera el enlace de confirmación y retorna el resultado de sendEmail', async () => {
      process.env.FRONTEND_URL = 'https://tic-rutas-aprendizaje.vercel.app';
      process.env.BREVO_API_KEY = 'test-key';

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messageId: 'verify-msg-123' }),
      });

      const res = await emailService.sendVerificationEmail('estudiante@epn.edu.ec', 'token-xyz');
      expect(res.ok).toBe(true);
      expect(res.messageId).toBe('verify-msg-123');
    });
  });
});
