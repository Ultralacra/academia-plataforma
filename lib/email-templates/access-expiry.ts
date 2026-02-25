/**
 * Plantillas de vencimiento de acceso / membresía.
 * Cada una corresponde a un día relativo a la fecha de expiración del acceso.
 *
 * Variables disponibles:
 *   {{recipientName}}  – Nombre del alumno
 *   {{appName}}        – Nombre de la app (Hotselling)
 *   {{expiryDate}}     – Fecha de vencimiento del acceso (legible)
 *   {{renewalLink}}    – Enlace de renovación
 *   {{portalLink}}     – URL del portal
 *   {{origin}}         – Dominio base
 */

export type AccessExpiryDay = "-5" | "-3" | "0" | "+1" | "+5";

export type AccessExpiryMeta = {
  day: AccessExpiryDay;
  key: string;
  name: string;
  description: string;
  subject: string;
};

const HEADER_IMAGE =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

export const DEFAULT_RENEWAL_LINK = "https://pay.hotmart.com/A89063724H?off=zou56c78&checkoutMode=6";

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Acceso – Hotselling</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e7e9f0;border-radius:12px;overflow:hidden;">
      <div style="padding:0;">
        <img src="${HEADER_IMAGE}" alt="Encabezado" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
      </div>
      <div style="padding:22px;">
${bodyHtml}
        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">Este correo fue enviado automáticamente. No respondas a este mensaje.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renewalButton() {
  return `
        <div style="margin:16px 0;">
          <a href="{{renewalLink}}" target="_blank" rel="noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">Renovar ahora 👇🏼</a>
        </div>`;
}

/* ─── Día -5 (Preventivo) ────────────────────────────────────── */

export function getAccessDay5BeforeSource() {
  const subject = "Tu acceso sigue activo — solo un recordatorio";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Esperamos que estés muy bien.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Solo pasamos por aquí para recordarte que tu membresía dentro de {{appName}} está próxima a finalizar en los próximos días.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si deseas continuar avanzando con el acompañamiento de coaches y soporte, puedes renovar en cualquier momento para mantener todo activo sin interrupciones.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí tienes el enlace de renovación 👇🏼</div>
${renewalButton()}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo de Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\nEsperamos que estés muy bien.\n\nSolo pasamos por aquí para recordarte que tu membresía dentro de {{appName}} está próxima a finalizar en los próximos días.\n\nSi deseas continuar avanzando con el acompañamiento de coaches y soporte, puedes renovar en cualquier momento para mantener todo activo sin interrupciones.\n\nAquí tienes el enlace de renovación:\n{{renewalLink}}\n\nUn abrazo,\nEquipo de Javier Quest`;

  return { subject, html, text };
}

/* ─── Día -3 (Recordatorio cercano) ──────────────────────────── */

export function getAccessDay3BeforeSource() {
  const subject = "Para que no pierdas continuidad en tu proceso";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos avisarte con tiempo que tu acceso actual a {{appName}} vence en <b>{{expiryDate}}</b>.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que este tipo de procesos se sostienen mejor cuando no hay pausas, por eso te compartimos el acceso de renovación para que sigas con soporte y acompañamiento activo.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Renovar aquí 👇🏼</div>
${renewalButton()}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Seguimos contigo,<br/><b>Equipo de Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\nQueríamos avisarte con tiempo que tu acceso actual a {{appName}} vence en {{expiryDate}}.\n\nSabemos que este tipo de procesos se sostienen mejor cuando no hay pausas, por eso te compartimos el acceso de renovación para que sigas con soporte y acompañamiento activo.\n\nRenovar aquí:\n{{renewalLink}}\n\nSeguimos contigo,\nEquipo de Javier Quest`;

  return { subject, html, text };
}

/* ─── Día 0 (Último día) ─────────────────────────────────────── */

export function getAccessDayOfSource() {
  const subject = "Último día con acceso activo";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Solo pasamos para avisarte que hoy es el <b>último día</b> de tu acceso activo dentro de {{appName}}.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si deseas continuar con soporte, sesiones y acompañamiento del equipo, puedes renovar hoy mismo y mantener todo habilitado sin cortes.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Renovación directa aquí 👇🏼</div>
${renewalButton()}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo de Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\nSolo pasamos para avisarte que hoy es el último día de tu acceso activo dentro de {{appName}}.\n\nSi deseas continuar con soporte, sesiones y acompañamiento del equipo, puedes renovar hoy mismo y mantener todo habilitado sin cortes.\n\nRenovación directa aquí:\n{{renewalLink}}\n\nUn abrazo,\nEquipo de Javier Quest`;

  return { subject, html, text };
}

/* ─── Día +1 (Vencido) ───────────────────────────────────────── */

export function getAccessDay1AfterSource() {
  const subject = "Acceso pausado temporalmente";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos informarte que tu membresía en {{appName}} ha finalizado, por lo que tu acceso quedó pausado de forma automática.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando desees retomar, puedes renovar en cualquier momento y reactivamos tu acceso de inmediato.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí está el enlace 👇🏼</div>
${renewalButton()}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Seguimos atentos,<br/><b>Equipo de Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\nQueríamos informarte que tu membresía en {{appName}} ha finalizado, por lo que tu acceso quedó pausado de forma automática.\n\nCuando desees retomar, puedes renovar en cualquier momento y reactivamos tu acceso de inmediato.\n\nAquí está el enlace:\n{{renewalLink}}\n\nSeguimos atentos,\nEquipo de Javier Quest`;

  return { subject, html, text };
}

/* ─── Día +5 (Seguimiento final) ─────────────────────────────── */

export function getAccessDay5AfterSource() {
  const subject = "¿Te gustaría retomar tu avance?";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pasamos por última vez para saber si deseas retomar tu proceso dentro de {{appName}}.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si en este momento no es prioridad, no te preocupes. Y si más adelante quieres continuar con el equipo, tu renovación estará disponible siempre.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Renovar cuando lo decidas 👇🏼</div>
${renewalButton()}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Con cariño,<br/><b>Equipo de Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\nPasamos por última vez para saber si deseas retomar tu proceso dentro de {{appName}}.\n\nSi en este momento no es prioridad, no te preocupes. Y si más adelante quieres continuar con el equipo, tu renovación estará disponible siempre.\n\nRenovar cuando lo decidas:\n{{renewalLink}}\n\nCon cariño,\nEquipo de Javier Quest`;

  return { subject, html, text };
}

/* ─── Registry ───────────────────────────────────────────────── */

export const ACCESS_EXPIRY_TEMPLATES: AccessExpiryMeta[] = [
  { day: "-5", key: "acceso_dia_m5", name: "Acceso: Día -5 (Preventivo)", description: "Anticipación suave – acceso vence en 5 días.", subject: "Tu acceso sigue activo — solo un recordatorio" },
  { day: "-3", key: "acceso_dia_m3", name: "Acceso: Día -3 (Recordatorio)", description: "Recordatorio cercano – vence en 3 días.", subject: "Para que no pierdas continuidad en tu proceso" },
  { day: "0", key: "acceso_dia_0", name: "Acceso: Día 0 (Último día)", description: "Urgencia amable – hoy vence el acceso.", subject: "Último día con acceso activo" },
  { day: "+1", key: "acceso_dia_p1", name: "Acceso: Día +1 (Vencido)", description: "Informar sin presión – acceso pausado.", subject: "Acceso pausado temporalmente" },
  { day: "+5", key: "acceso_dia_p5", name: "Acceso: Día +5 (Seguimiento final)", description: "Cierre elegante – última comunicación.", subject: "¿Te gustaría retomar tu avance?" },
];

const SOURCE_BUILDERS: Record<AccessExpiryDay, () => { subject: string; html: string; text: string }> = {
  "-5": getAccessDay5BeforeSource,
  "-3": getAccessDay3BeforeSource,
  "0": getAccessDayOfSource,
  "+1": getAccessDay1AfterSource,
  "+5": getAccessDay5AfterSource,
};

export function getAccessExpirySource(day: AccessExpiryDay) {
  return SOURCE_BUILDERS[day]();
}
