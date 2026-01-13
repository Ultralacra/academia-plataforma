export type WelcomeEmailParams = {
  appName?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientUsername?: string | null;
  recipientPassword?: string | null;
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

export function buildWelcomeEmail(params: WelcomeEmailParams) {
  const appName = params.appName?.trim() || "Hotselling";
  const recipientName = (params.recipientName ?? "").trim();
  const origin = params.origin?.trim() || "https://academia.valinkgroup.com";
  const portalLink = (params.portalLink ?? "").trim();
  const recipientEmail = (params.recipientEmail ?? "").trim();
  const recipientUsername = (params.recipientUsername ?? "").trim();
  const recipientPassword = (params.recipientPassword ?? "").trim();
  const headerImageUrl =
    params.headerImageUrl?.trim() ||
    // Reutilizamos el mismo banner que usan los formularios de bonos.
    "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

  const safeRecipientName = recipientName ? esc(recipientName) : "";

  const subject = "Tu nuevo Portal de soporte de Hotselling (accesos incluidos)";
  const greeting = safeRecipientName
    ? `Hola ${safeRecipientName}, ¿cómo estás?`
    : "Hola, ¿cómo estás?";

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
          <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">${greeting}</div>
          <div style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
            Queremos informarte que ya está activo nuestro nuevo <b>Portal de Atención al Cliente</b>, que desde ahora será el canal principal de acompañamiento y seguimiento de tu proceso dentro de ${esc(appName)}.
          </div>
        </div>

        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">
          Desde este portal podrás:
          <ul style="margin:8px 0 0 18px;padding:0;color:#374151;">
            <li style="margin:6px 0;">Ver el estado de tus consultas</li>
            <li style="margin:6px 0;">Ver las respuestas de tu coach apenas sean respondidas</li>
            <li style="margin:6px 0;">Acceder a la información importante de tu proceso</li>
            <li style="margin:6px 0;">Comunicación directa con el canal de soporte</li>
          </ul>
        </div>

        ${(recipientEmail || recipientUsername || recipientPassword) ? `
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 14px;margin:18px 0;">
          <div style="margin:0 0 10px 0;color:#111827;font-size:14px;font-weight:800;">🔐 Tus datos de acceso</div>
          ${(recipientUsername || recipientEmail) ? `<div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Usuario:</b> ${esc(recipientUsername || recipientEmail)}</div>` : ""}
          ${recipientPassword ? `<div style="margin:6px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Contraseña:</b> ${esc(recipientPassword)}</div>` : ""}
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
            👉 Ingresa aquí al portal
          </a>
        </div>
        <div style="color:#6b7280;font-size:12px;line-height:1.5;">Te recomendamos guardar este correo. Si el botón no funciona, abre este enlace: <span style="word-break:break-all;">${esc(computedPortalLink)}</span></div>
        ` : ""}

        <div style="margin-top:16px;color:#374151;font-size:14px;line-height:1.6;">
          <b>PD:</b> WhatsApp quedará disponible únicamente como canal de respaldo, para apoyarte solo en caso de que no recibas este correo o presentes inconvenientes para ingresar al portal.
        </div>
        <div style="margin-top:10px;color:#374151;font-size:14px;line-height:1.6;">
          Recuerda que, antes de realizar tu consulta, debes indicarnos tu nombre y apellido:
          <div style="margin-top:8px;">
            <a href="${esc(whatsappLink)}" target="_blank" rel="noreferrer" style="color:#111827;font-weight:700;text-decoration:underline;">👉 ${esc(whatsappLink)}</a>
          </div>
        </div>

        <div style="margin-top:14px;color:#374151;font-size:14px;line-height:1.6;">
          Este cambio es para darte más claridad y un mejor acompañamiento.
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

  const text = `${greeting}\n\nQueremos informarte que ya está activo nuestro nuevo Portal de Atención al Cliente, que desde ahora será el canal principal de acompañamiento y seguimiento de tu proceso dentro de ${appName}.\n\nDesde este portal podrás:\n- Ver el estado de tus consultas\n- Ver las respuestas de tu coach apenas sean respondidas\n- Acceder a la información importante de tu proceso\n- Comunicación directa con el canal de soporte\n\n${(recipientEmail || recipientUsername || recipientPassword) ? `Tus datos de acceso\nUsuario: ${(recipientUsername || recipientEmail) || ""}\nContraseña: ${recipientPassword || ""}\n\n` : ""}${computedPortalLink ? `Ingresa aquí al portal: ${computedPortalLink}\n\nTe recomendamos guardar este correo.\n\n` : ""}PD: WhatsApp quedará disponible únicamente como canal de respaldo.\nAntes de realizar tu consulta, indícanos tu nombre y apellido: ${whatsappLink}\n\nEste cambio es para darte más claridad y un mejor acompañamiento.\n\nUn abrazo,\nEquipo de Hotselling\n\nEste correo fue enviado automáticamente. No respondas a este mensaje.`;

  return { subject, html, text };
}
