export type ReminderEmailParams = {
  appName?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
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

export function buildReminderEmail(params: ReminderEmailParams) {
  const appName = params.appName?.trim() || "Hotselling";
  const recipientName = (params.recipientName ?? "").trim();
  const origin = params.origin?.trim() || "https://academia.valinkgroup.com";
  const portalLink = (params.portalLink ?? "").trim();
  const headerImageUrl =
    params.headerImageUrl?.trim() ||
    "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

  const safeRecipientName = recipientName ? esc(recipientName) : "";

  const subject = "Recordatorio: tu acompañamiento de Hotselling ahora se gestiona desde el Portal";
  const greeting = "Hola hotseller";

  const computedPortalLink = portalLink
    ? portalLink
    : origin
      ? `${origin.replace(/\/$/, "")}/login`
      : "";

  const whatsappLink = "https://wa.link/9ojq40";

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
          <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">${greeting},</div>
          <div style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
            Te recordamos que el <b>Portal</b> para brindarte acompañamiento ya es el <b>canal principal</b> para el seguimiento de tu proceso.
          </div>
        </div>

        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">
          Allí podrás ver:
          <ul style="margin:8px 0 0 18px;padding:0;color:#374151;">
            <li style="margin:6px 0;">El estado de tus consultas</li>
            <li style="margin:6px 0;">Cuando algo esté en revisión con tu coach</li>
            <li style="margin:6px 0;">Las respuestas del equipo y del coach</li>
          </ul>
        </div>

        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:18px 0;">
          <div style="margin:0 0 10px 0;color:#111827;font-size:14px;font-weight:800;">🔐 Los accesos fueron enviados a tu correo electrónico</div>
          <div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;">
            Por favor revisa tu bandeja principal, spam o promociones.
          </div>
        </div>

        ${computedPortalLink ? `
        <div style="margin:18px 0;">
          <a
            href="${esc(computedPortalLink)}"
            target="_blank"
            rel="noreferrer"
            style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;"
          >
            👉 Ingresa aquí al portal
          </a>
        </div>
        ` : ""}

        <div style="margin-top:16px;color:#374151;font-size:14px;line-height:1.6;">
          Si no encuentras el correo o tienes problemas para ingresar, puedes escribirnos por WhatsApp <b>solo para ayudarte con el acceso</b>.
        </div>

        <div style="margin-top:10px;color:#374151;font-size:14px;line-height:1.6;">
          Recuerda que, antes de realizar tu consulta, debes indicarnos tu nombre y apellido:
          <div style="margin-top:8px;">
            <a href="${esc(whatsappLink)}" target="_blank" rel="noreferrer" style="color:#111827;font-weight:700;text-decoration:underline;">👉 ${esc(whatsappLink)}</a>
          </div>
        </div>

        <div style="margin-top:16px;color:#111827;font-size:14px;line-height:1.6;">
          Un abrazo,<br/>
          <b>Equipo de Hotselling</b>
        </div>

        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">
          Este correo fue enviado automáticamente. No respondas a este mensaje.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `${greeting},\n\nTe recordamos que el Portal para brindarte acompañamiento ya es el canal principal para el seguimiento de tu proceso.\n\nAllí podrás ver:\n- El estado de tus consultas\n- Cuando algo esté en revisión con tu coach\n- Las respuestas del equipo y del coach\n\n🔐 Los accesos fueron enviados a tu correo electrónico.\nPor favor revisa tu bandeja principal, spam o promociones.\n\n${computedPortalLink ? `Ingresa aquí al portal: ${computedPortalLink}\n\n` : ""}Si no encuentras el correo o tienes problemas para ingresar, puedes escribirnos por WhatsApp solo para ayudarte con el acceso.\n\nRecuerda que, antes de realizar tu consulta, debes indicarnos tu nombre y apellido: ${whatsappLink}\n\nUn abrazo,\nEquipo de Hotselling\n\nEste correo fue enviado automáticamente. No respondas a este mensaje.`;

  return { subject, html, text };
}

/**
 * Returns the email template SOURCE with {{variable}} placeholders.
 * Stored in metadata, edited by admins. Interpolated at send-time.
 */
export function getReminderEmailSource() {
  const headerImageUrl =
    "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";
  const whatsappLink = "https://wa.link/9ojq40";

  const subject = "Recordatorio: tu acompañamiento de Hotselling ahora se gestiona desde el Portal";

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recordatorio</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e7e9f0;border-radius:12px;overflow:hidden;">
      <div style="padding:0;">
        <img src="${headerImageUrl}" alt="Encabezado" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
      </div>
      <div style="padding:22px;">
        <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:0 0 16px 0;">
          <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola hotseller,</div>
          <div style="margin:0;color:#374151;font-size:14px;line-height:1.6;">Te recordamos que el <b>Portal</b> para brindarte acompañamiento ya es el <b>canal principal</b> para el seguimiento de tu proceso.</div>
        </div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Allí podrás ver:
          <ul style="margin:8px 0 0 18px;padding:0;color:#374151;">
            <li style="margin:6px 0;">El estado de tus consultas</li>
            <li style="margin:6px 0;">Cuando algo esté en revisión con tu coach</li>
            <li style="margin:6px 0;">Las respuestas del equipo y del coach</li>
          </ul>
        </div>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:18px 0;">
          <div style="margin:0 0 10px 0;color:#111827;font-size:14px;font-weight:800;">🔐 Los accesos fueron enviados a tu correo electrónico</div>
          <div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;">Por favor revisa tu bandeja principal, spam o promociones.</div>
        </div>
        <div style="margin:18px 0;">
          <a href="{{portalLink}}" target="_blank" rel="noreferrer" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">👉 Ingresa aquí al portal</a>
        </div>
        <div style="margin-top:16px;color:#374151;font-size:14px;line-height:1.6;">Si no encuentras el correo o tienes problemas para ingresar, puedes escribirnos por WhatsApp <b>solo para ayudarte con el acceso</b>.</div>
        <div style="margin-top:10px;color:#374151;font-size:14px;line-height:1.6;">Recuerda que, antes de realizar tu consulta, debes indicarnos tu nombre y apellido:
          <div style="margin-top:8px;"><a href="${whatsappLink}" target="_blank" rel="noreferrer" style="color:#111827;font-weight:700;text-decoration:underline;">👉 ${whatsappLink}</a></div>
        </div>
        <div style="margin-top:16px;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo de Hotselling</b></div>
        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">Este correo fue enviado automáticamente. No respondas a este mensaje.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hola hotseller,\n\nTe recordamos que el Portal para brindarte acompañamiento ya es el canal principal para el seguimiento de tu proceso.\n\nAllí podrás ver:\n- El estado de tus consultas\n- Cuando algo esté en revisión con tu coach\n- Las respuestas del equipo y del coach\n\n🔐 Los accesos fueron enviados a tu correo electrónico.\nPor favor revisa tu bandeja principal, spam o promociones.\n\nIngresa aquí al portal: {{portalLink}}\n\nSi no encuentras el correo o tienes problemas para ingresar, puedes escribirnos por WhatsApp solo para ayudarte con el acceso.\nAntes de realizar tu consulta, indícanos tu nombre y apellido: ${whatsappLink}\n\nUn abrazo,\nEquipo de Hotselling\n\nEste correo fue enviado automáticamente. No respondas a este mensaje.`;

  return { subject, html, text };
}
