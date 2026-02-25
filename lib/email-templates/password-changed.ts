export type PasswordChangedEmailParams = {
  appName?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientUsername?: string | null;
  newPassword?: string | null;
  origin?: string;
  portalLink?: string | null;
  headerImageUrl?: string;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildPasswordChangedEmail(params: PasswordChangedEmailParams) {
  const appName = params.appName?.trim() || "Hotselling";
  const recipientName = (params.recipientName ?? "").trim();
  const origin = params.origin?.trim() || "https://academia.valinkgroup.com";
  const portalLink = (params.portalLink ?? "").trim();
  const recipientEmail = (params.recipientEmail ?? "").trim();
  const recipientUsername = (params.recipientUsername ?? "").trim();
  const newPassword = (params.newPassword ?? "").trim();
  const headerImageUrl =
    params.headerImageUrl?.trim() ||
    "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

  const safeRecipientName = recipientName ? esc(recipientName) : "";
  const subject = "Tu contraseña fue actualizada";
  const greeting = safeRecipientName
    ? `Hola ${safeRecipientName}, ¿cómo estás?`
    : "Hola, ¿cómo estás?";

  const computedPortalLink = portalLink
    ? portalLink
    : origin
      ? `${origin.replace(/\/$/, "")}/login`
      : "";

  const resolvedUser = recipientUsername || recipientEmail;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e7e9f0;border-radius:12px;overflow:hidden;">
      <div style="padding:0;">
        <img
          src="${esc(headerImageUrl)}"
          alt="Encabezado"
          style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
        />
      </div>

      <div style="padding:22px;">
        <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:0 0 16px 0;">
          <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">${greeting}</div>
          <div style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
            Te confirmamos que tu <b>contraseña</b> fue actualizada para el portal de ${esc(appName)}.
          </div>
        </div>

        ${(resolvedUser || newPassword) ? `
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:18px 0;">
          <div style="margin:0 0 10px 0;color:#111827;font-size:14px;font-weight:800;">🔐 Tus datos de acceso</div>
          ${resolvedUser ? `<div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Usuario:</b> ${esc(resolvedUser)}</div>` : ""}
          ${newPassword ? `<div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Contraseña:</b> ${esc(newPassword)}</div>` : ""}
        </div>
        ` : ""}

        ${computedPortalLink ? `
        <div style="margin:18px 0;">
          <a
            href="${esc(computedPortalLink)}"
            target="_blank"
            rel="noreferrer"
            style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;"
          >
            👉 Ingresar al portal
          </a>
        </div>
        <div style="color:#6b7280;font-size:12px;line-height:1.5;">Si el botón no funciona, abre este enlace: <span style="word-break:break-all;">${esc(computedPortalLink)}</span></div>
        ` : ""}

        <div style="margin-top:16px;color:#374151;font-size:14px;line-height:1.6;">
          Si tú no solicitaste este cambio, por favor comunícate con soporte.
        </div>

        <div style="margin-top:16px;color:#111827;font-size:14px;line-height:1.6;">
          Un abrazo,<br/>
          <b>Equipo de ${esc(appName)}</b>
        </div>

        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">
          Este correo fue enviado automáticamente. No respondas a este mensaje.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `${greeting}\n\nTe confirmamos que tu contraseña fue actualizada para el portal de ${appName}.\n\n${resolvedUser ? `Usuario: ${resolvedUser}\n` : ""}${newPassword ? `Contraseña: ${newPassword}\n\n` : "\n"}${computedPortalLink ? `Ingresar al portal: ${computedPortalLink}\n\n` : ""}Si tú no solicitaste este cambio, por favor comunícate con soporte.\n\nUn abrazo,\nEquipo de ${appName}\n\nEste correo fue enviado automáticamente. No respondas a este mensaje.`;

  return { subject, html, text };
}

/**
 * Returns the email template SOURCE with {{variable}} placeholders.
 * This is the version stored in metadata and edited by admins.
 * At send-time, {{variables}} are interpolated with actual values
 * by applyTemplateOverrideWithVars() in template-runtime.
 */
export function getPasswordChangedEmailSource() {
  const headerImageUrl =
    "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

  const subject = "Tu contraseña fue actualizada";

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tu contraseña fue actualizada</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e7e9f0;border-radius:12px;overflow:hidden;">
      <div style="padding:0;">
        <img
          src="${headerImageUrl}"
          alt="Encabezado"
          style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
        />
      </div>

      <div style="padding:22px;">
        <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:0 0 16px 0;">
          <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}}, ¿cómo estás?</div>
          <div style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
            Te confirmamos que tu <b>contraseña</b> fue actualizada para el portal de {{appName}}.
          </div>
        </div>

        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:18px 0;">
          <div style="margin:0 0 10px 0;color:#111827;font-size:14px;font-weight:800;">🔐 Tus datos de acceso</div>
          <div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Usuario:</b> {{recipientUsername}}</div>
          <div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Contraseña:</b> {{newPassword}}</div>
        </div>

        <div style="margin:18px 0;">
          <a
            href="{{portalLink}}"
            target="_blank"
            rel="noreferrer"
            style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;"
          >
            👉 Ingresar al portal
          </a>
        </div>
        <div style="color:#6b7280;font-size:12px;line-height:1.5;">Si el botón no funciona, abre este enlace: <span style="word-break:break-all;">{{portalLink}}</span></div>

        <div style="margin-top:16px;color:#374151;font-size:14px;line-height:1.6;">
          Si tú no solicitaste este cambio, por favor comunícate con soporte.
        </div>

        <div style="margin-top:16px;color:#111827;font-size:14px;line-height:1.6;">
          Un abrazo,<br/>
          <b>Equipo de {{appName}}</b>
        </div>

        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">
          Este correo fue enviado automáticamente. No respondas a este mensaje.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hola {{recipientName}}, ¿cómo estás?\n\nTe confirmamos que tu contraseña fue actualizada para el portal de {{appName}}.\n\nUsuario: {{recipientUsername}}\nContraseña: {{newPassword}}\n\nIngresar al portal: {{portalLink}}\n\nSi tú no solicitaste este cambio, por favor comunícate con soporte.\n\nUn abrazo,\nEquipo de {{appName}}\n\nEste correo fue enviado automáticamente. No respondas a este mensaje.`;

  return { subject, html, text };
}
