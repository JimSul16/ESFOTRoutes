import nodemailer from 'nodemailer';
import "dotenv/config";

/**
 * Normaliza y limpia la URL base del frontend para enlaces en correos.
 * Soporta listas separadas por coma (producción + previews) y elimina barras finales.
 */
export const getFrontendUrl = () => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const first = raw.split(',')[0].trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  return first || 'http://localhost:5173';
};

// ── Transporter Singleton con Nodemailer (100% Gratuito) ─────────────────────
let _transporter = null;

const getTransporter = () => {
  if (!_transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      _transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
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
 * Función base de envío de correos multi-proveedor.
 *
 * Estrategia de envío:
 *  1. Brevo / Sendinblue (HTTPS Puerto 443 REST API):
 *     300 correos/día gratuitos. NO exige dominio DNS propio; permite enviar
 *     a cualquier destinatario (@epn.edu.ec, @gmail.com) con solo verificar el remitente.
 *  2. SendGrid (HTTPS Puerto 443 REST API):
 *     100 correos/día gratuitos con Single Sender Verification (sin dominio DNS).
 *  3. Resend (HTTPS Puerto 443 REST API):
 *     Requiere dominio DNS verificado para enviar a cualquier usuario, o solo a la cuenta propia en modo sandbox.
 *  4. Nodemailer SMTP (Gmail):
 *     Solo para desarrollo local. En Render (producción) los puertos SMTP 25/465/587 están bloqueados por firewall.
 *
 * @returns {Promise<{ ok: boolean, simulated?: boolean, error?: string, messageId?: string }>}
 */
export const sendEmail = async ({ to, subject, html }) => {
  const recipientsList = Array.isArray(to) ? to : [to];
  const primaryRecipient = recipientsList[0];

  // ── 0. Webhook HTTPS (Google Apps Script / Microservicio propio) ───────────
  // Ideal si Brevo o SMS tienen problemas de activación: envía directo desde Gmail vía HTTPS
  const mailWebhookUrl = process.env.MAIL_WEBHOOK_URL;
  if (mailWebhookUrl) {
    try {
      const response = await fetch(mailWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientsList,
          subject,
          html,
        }),
        redirect: 'follow',
      });

      if (response.ok || response.status === 302) {
        console.log(`✉️ Correo enviado vía Webhook HTTPS a [${recipientsList.join(', ')}]`);
        return { ok: true, messageId: 'webhook-ok' };
      }

      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${errText}`);
    } catch (error) {
      console.error(`⚠️ Error enviando correo vía Webhook a [${primaryRecipient}]:`, error.message);
    }
  }

  // ── 1. Brevo / Sendinblue vía HTTPS REST (Puerto 443) ──────────────────────
  // Ideal para proyectos universitarios: no requiere administrar DNS de @epn.edu.ec
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoApiKey) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'jimmito636@gmail.com';
      const senderName = process.env.BREVO_SENDER_NAME || 'Plataforma ESFOT';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: recipientsList.map((addr) => ({ email: addr.trim() })),
          subject,
          htmlContent: html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }

      console.log(`✉️ Correo enviado vía Brevo a [${recipientsList.join(', ')}] (ID: ${data.messageId})`);
      return { ok: true, messageId: data.messageId };
    } catch (error) {
      console.error(`⚠️ Error enviando correo vía Brevo a [${primaryRecipient}]:`, error.message);
    }
  }

  // ── 2. SendGrid vía HTTPS REST (Puerto 443) ───────────────────────────────
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) {
    try {
      const senderEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER || 'jimmito636@gmail.com';
      const senderName = process.env.SENDGRID_FROM_NAME || 'Plataforma ESFOT';

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: recipientsList.map((addr) => ({ email: addr.trim() })) }],
          from: { email: senderEmail, name: senderName },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.errors?.[0]?.message || `HTTP ${response.status}`);
      }

      console.log(`✉️ Correo enviado vía SendGrid a [${recipientsList.join(', ')}]`);
      return { ok: true, messageId: 'sendgrid-ok' };
    } catch (error) {
      console.error(`⚠️ Error enviando correo vía SendGrid a [${primaryRecipient}]:`, error.message);
    }
  }

  // ── 3. Resend vía HTTPS REST (Puerto 443) ──────────────────────────────────
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Plataforma ESFOT <onboarding@resend.dev>',
          to: recipientsList,
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        // Diagnóstico claro para el error sandbox de Resend
        if (data.message && data.message.includes('only send testing emails to your own email')) {
          console.error(
            `⚠️ Resend está en modo sandbox (onboarding@resend.dev). Solo puede enviar correos a su propia cuenta. ` +
            `Para enviar a estudiantes @epn.edu.ec configure BREVO_API_KEY (sin necesidad de DNS) o verifique un dominio en Resend.`
          );
        }
        throw new Error(data.message || JSON.stringify(data));
      }

      console.log(`✉️ Correo enviado vía Resend a [${recipientsList.join(', ')}] (ID: ${data.id})`);
      return { ok: true, messageId: data.id };
    } catch (error) {
      console.error(`⚠️ Error enviando correo vía Resend a [${primaryRecipient}]:`, error.message);
    }
  }

  // ── 4. Detección de entorno Render / Producción ────────────────────────────
  // Render bloquea las salidas a puertos SMTP 25, 465 y 587. Intentar conectar
  // causa un congelamiento de 8-15 segundos por timeout de socket.
  const isRender = process.env.RENDER === 'true' || Boolean(process.env.RENDER_SERVICE_ID);
  if (isRender) {
    const errorMsg =
      'Los puertos SMTP (25, 465, 587) están bloqueados en Render. ' +
      'Configure una clave API HTTPS en las variables de Render: BREVO_API_KEY (recomendado), SENDGRID_API_KEY o RESEND_API_KEY.';
    console.error(`⚠️ [Render Producción] ${errorMsg}`);
    return { ok: false, error: errorMsg };
  }

  // ── 5. Nodemailer SMTP (Local / Servidor con puertos abiertos) ───────────────
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`⚠️ SMTP no configurado en .env. Correo simulado para [${primaryRecipient}] con asunto: "${subject}"`);
    return { ok: false, simulated: true, error: 'SMTP no está configurado en el servidor (.env).' };
  }

  const sender = process.env.SMTP_USER;

  try {
    const info = await transporter.sendMail({
      from: `"Plataforma ESFOT" <${sender}>`,
      to: recipientsList.join(', '),
      subject,
      html,
    });

    console.log(`✉️ Correo enviado vía SMTP a [${recipientsList.join(', ')}] (MessageId: ${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    console.error(`⚠️ Error enviando correo vía SMTP a [${primaryRecipient}]:`, error.message);
    return { ok: false, error: error.message };
  }
};

// ── 1. Correo de Código 2FA / OTP ─────────────────────────────────────────────
/**
 * @returns {Promise<{ ok: boolean, error?: string }>} para que el login pueda
 * avisar al usuario cuando el código NO llegó a enviarse.
 */
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

    return await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("⚠️ Error enviando correo OTP:", error.message);
    return { ok: false, error: error.message };
  }
};

// ── 2. Correo de Verificación de Cuenta ───────────────────────────────────────
export const sendVerificationEmail = async (email, token) => {
  try {
    const verificationLink = `${getFrontendUrl()}/confirm/${token}`;
    console.log(`🔑 [VERIFICATION LINK] Enlace para [${email}]: ${verificationLink}`);
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

    return await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("⚠️ Error enviando verificación:", error.message);
    return { ok: false, error: error.message };
  }
};

// ── 3. Correo de Recuperación de Contraseña ───────────────────────────────────
export const sendPasswordResetEmail = async (email, name, token) => {
  try {
    const resetLink = `${getFrontendUrl()}/reset-password/${token}`;
    console.log(`🔑 [PASSWORD RESET] Enlace generado para [${email}]: ${resetLink}`);
    const subject = "Recuperación de Contraseña - ESFOT";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #1e3a8a; text-align: center;">Recuperación de Acceso</h2>
        <p>Hola ${name || 'Usuario'},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace (expira en 1 hora):</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer mi contraseña</a>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.</p>
      </div>
    `;

    return await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error("⚠️ Error enviando restablecimiento:", error.message);
    return { ok: false, error: error.message };
  }
};

// ── 4. Alerta al Administrador por Bloqueo Crítico de Cuenta ──────────────────
/**
 * Avisa a los administradores del bloqueo de una cuenta.
 *
 * @param {object} params
 * @param {string[]} params.adminEmails  Destinatarios (usuarios con rol ADMIN).
 */
export const sendAdminLockoutAlertEmail = async ({ adminEmails, user, ipAddress, deviceInfo, unlockUrl }) => {
  try {
    const recipients = (Array.isArray(adminEmails) ? adminEmails : [adminEmails])
      .filter(Boolean);

    if (!recipients.length) {
      console.warn(`⚠️ Sin destinatarios para la alerta de bloqueo de [${user.email}].`);
      return { ok: false, error: 'sin destinatarios' };
    }

    const finalUnlockUrl = unlockUrl || `${getFrontendUrl()}/desbloquear-cuenta/${user.unlockToken}`;

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
          <a href="${finalUnlockUrl}" style="background-color: #16a34a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
            ✓ Desbloquear Cuenta Ahora
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 11px; text-align: center;">Si consideras que este intento es malicioso o sospechoso, no es necesario hacer clic en el enlace.</p>
      </div>
    `;

    const result = await sendEmail({ to: recipients, subject, html });

    if (result?.ok) {
      console.log(`🚨 Correo de alerta de bloqueo enviado a (${recipients.join(', ')}) para la cuenta [${user.email}]`);
    }

    return result;
  } catch (error) {
    console.error("⚠️ Error enviando alerta de bloqueo al administrador:", error.message);
    return { ok: false, error: error.message };
  }
};
