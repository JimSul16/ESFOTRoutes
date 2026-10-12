import nodemailer from 'nodemailer';
import "dotenv/config";

// ── Transporter Singleton con Nodemailer (100% Gratuito) ─────────────────────
let _transporter = null;

const getTransporter = () => {
  if (!_transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      _transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
          user: user,
          pass: pass, // Contraseña de aplicación de Google (16 caracteres)
        },
      });
    }
  }
  return _transporter;
};

/**
 * Función base de envío de correos vía Nodemailer.
 */
export const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`⚠️  SMTP no configurado en .env. Correo simulado para [${to}] con asunto: "${subject}"`);
    return { simulated: true };
  }

  const sender = process.env.SMTP_USER;
  const info = await transporter.sendMail({
    from: `"Plataforma ESFOT" <${sender}>`,
    to,
    subject,
    html,
  });

  console.log(`✉️ Correo enviado a ${to} (MessageId: ${info.messageId})`);
  return info;
};

// ── 1. Correo de Código 2FA / OTP ─────────────────────────────────────────────
export const sendOTPEmail = async (email, name, otpCode) => {
  try {
    const subject = "Tu código de verificación de inicio de sesión - ESFOT";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 8px;">Código de Acceso 2FA</h2>
        <p style="color: #475569; font-size: 14px; text-align: center;">Hola ${name || 'Usuario'}, ingresa el siguiente código para completar tu inicio de sesión en la plataforma ESFOT:</p>
        
        <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 18px; margin: 25px 0; text-align: center;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otpCode}</span>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center;">Este código es de un solo uso y expirará en <strong>10 minutos</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">Si tú no intentaste iniciar sesión, ignora este mensaje.</p>
      </div>
    `;

    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("⚠️ Error enviando correo OTP:", error.message);
  }
};

// ── 2. Correo de Verificación de Cuenta ───────────────────────────────────────
export const sendVerificationEmail = async (email, token) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm/${token}`;
    const subject = "Verifica tu cuenta institucional ESFOT";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Bienvenido a ESFOT</h2>
        <p style="color: #333; font-size: 16px;">Para activar tu cuenta institucional, haz clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar mi cuenta</a>
        </div>
        <p style="color: #777; font-size: 12px; text-align: center;">Si no solicitaste este registro, puedes ignorar este correo.</p>
      </div>
    `;

    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("⚠️ Error enviando verificación:", error.message);
  }
};

// ── 3. Correo de Recuperación de Contraseña ───────────────────────────────────
export const sendPasswordResetEmail = async (email, name, token) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    const subject = "Recuperación de Contraseña - ESFOT";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #1e3a8a; text-align: center;">Recuperación de Acceso</h2>
        <p>Hola ${name || 'Usuario'},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace (expira en 1 hora):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer mi contraseña</a>
        </div>
      </div>
    `;

    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("⚠️ Error enviando restablecimiento:", error.message);
  }
};

// ── 4. Alerta al Administrador por Bloqueo Crítico de Cuenta ──────────────────
export const sendAdminLockoutAlertEmail = async ({ adminEmail, user, ipAddress, deviceInfo, unlockUrl }) => {
  try {
    const subject = `🚨 ALERTA DE SEGURIDAD: Cuenta Bloqueada por Intentos Excedidos (${user.email})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 2px solid #ef4444; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #b91c1c; text-align: center; margin-top: 0;">🚨 Alerta de Seguridad - ESFOT</h2>
        <p style="color: #374151; font-size: 14px;">Se ha bloqueado la siguiente cuenta tras exceder el límite máximo de intentos fallidos de inicio de sesión:</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 13px; color: #1f2937;">
          <p style="margin: 4px 0;"><strong>Usuario:</strong> ${user.name || 'Sin nombre'}</p>
          <p style="margin: 4px 0;"><strong>Correo afectado:</strong> ${user.email}</p>
          <p style="margin: 4px 0;"><strong>Dirección IP detectada:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${ipAddress}</code></p>
          <p style="margin: 4px 0;"><strong>Dispositivo / Máquina:</strong> ${deviceInfo}</p>
          <p style="margin: 4px 0;"><strong>Fecha y Hora:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p style="color: #4b5563; font-size: 13px;">Para autorizar el acceso nuevamente y desbloquear a este estudiante o usuario, haz clic en el siguiente botón:</p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${unlockUrl}" style="background-color: #16a34a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
            ✓ Desbloquear Cuenta Ahora
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 11px; text-align: center;">Si consideras que este intento es malicioso o sospechoso, no es necesario hacer clic en el enlace.</p>
      </div>
    `;

    await sendEmail({ to: adminEmail, subject, html });
    console.log(`🚨 Correo de alerta de bloqueo enviado al Administrador (${adminEmail}) para la cuenta [${user.email}]`);
  } catch (error) {
    console.error("⚠️ Error enviando alerta de bloqueo al administrador:", error.message);
  }
};