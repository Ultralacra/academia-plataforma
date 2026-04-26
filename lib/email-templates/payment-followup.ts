/**
 * Plantillas de seguimiento de pagos.
 * Cada una corresponde a un día relativo a la fecha de vencimiento de cuota.
 *
 * Variables disponibles:
 *   {{recipientName}}  – Nombre del alumno
 *   {{appName}}        – Nombre de la app (Hotselling)
 *   {{cuotaCodigo}}    – Código/nombre de la cuota
 *   {{dueDate}}        – Fecha de vencimiento legible
 *   {{amount}}         – Monto de la cuota
 *   {{paymentLinks}}   – Bloque HTML con los enlaces de pago
 *   {{portalLink}}     – URL del portal
 *   {{origin}}         – Dominio base
 */

export type PaymentFollowupDay = "-3" | "-1" | "0" | "+2" | "+4" | "+6";

export type PaymentFollowupMeta = {
  day: PaymentFollowupDay;
  key: string;
  name: string;
  description: string;
  subject: string;
};

const HEADER_IMAGE =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

/**
 * Bloque HTML con los enlaces de pago para que el alumno seleccione su plan.
 * Se usa como valor default de {{paymentLinks}}.
 */
export const DEFAULT_PAYMENT_LINKS_HTML = `
<div style="margin:18px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
  <div style="margin:0 0 10px 0;color:#111827;font-size:14px;font-weight:800;">🔗 Enlaces de pago</div>
  <div style="margin:0 0 8px 0;color:#374151;font-size:13px;font-weight:700;">Hotselling Starter:</div>
  <div style="margin:4px 0;"><a href="https://pay.hotmart.com/Y93936435M?off=vcnatosn&checkoutMode=10" target="_blank" rel="noreferrer" style="color:#2563eb;font-size:13px;">👉 Pagar en 2 cuotas</a></div>
  <div style="margin:4px 0;"><a href="https://pay.hotmart.com/Y93936435M?off=kxxqvjut&checkoutMode=10" target="_blank" rel="noreferrer" style="color:#2563eb;font-size:13px;">👉 Pagar en 3 cuotas</a></div>
  <div style="margin:12px 0 8px 0;color:#374151;font-size:13px;font-weight:700;">Hotselling PRO:</div>
  <div style="margin:4px 0;"><a href="https://pay.hotmart.com/Y93936435M?off=4gkynmtm&checkoutMode=10&bid=1770540069632" target="_blank" rel="noreferrer" style="color:#2563eb;font-size:13px;">👉 Pagar en 2 cuotas</a></div>
  <div style="margin:4px 0;"><a href="https://pay.hotmart.com/Y93936435M?off=9ns5b9wf&checkoutMode=10" target="_blank" rel="noreferrer" style="color:#2563eb;font-size:13px;">👉 Pagar en 3 cuotas</a></div>
  <div style="margin:10px 0 0 0;color:#6b7280;font-size:11px;">Selecciona el enlace que corresponda a tu plan.</div>
</div>`;

export const DEFAULT_PAYMENT_LINKS_TEXT = `\nEnlaces de pago:\n\nHotselling Starter:\n- Pagar en 2 cuotas: https://pay.hotmart.com/Y93936435M?off=vcnatosn&checkoutMode=10\n- Pagar en 3 cuotas: https://pay.hotmart.com/Y93936435M?off=kxxqvjut&checkoutMode=10\n\nHostelling PRO:\n- Pagar en 2 cuotas: https://pay.hotmart.com/Y93936435M?off=4gkynmtm&checkoutMode=10&bid=1770540069632\n- Pagar en 3 cuotas: https://pay.hotmart.com/Y93936435M?off=9ns5b9wf&checkoutMode=10\n\nSelecciona el enlace que corresponda a tu plan.\n`;

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Seguimiento de pago</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e7e9f0;border-radius:12px;overflow:hidden;">
      <div style="padding:0;">
        <img src="${HEADER_IMAGE}" alt="Encabezado" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
      </div>
      <div style="padding:22px;">
${bodyHtml}
        <div style="margin-top:16px;color:#111827;font-size:14px;line-height:1.6;">Quedamos atentos.<br/><b>Equipo {{appName}}</b></div>
        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">Este correo fue enviado automáticamente. No respondas a este mensaje.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* ─── Día -3 ─────────────────────────────────────────────────── */

export function getPaymentDay3BeforeSource() {
  const subject = "Seguimiento de tu proceso en Hotselling";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}}, ¿cómo estás?</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pasamos por aquí para acompañarte en este punto de tu proceso.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Tu próxima cuota vence en <b>3 días</b>, y gestionarla a tiempo te permite continuar sin pausas en tu formación, accesos y acompañamiento estratégico.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Te dejamos los enlaces para facilitarte la gestión:</div>
        {{paymentLinks}}
        <div style="margin:14px 0 0 0;color:#374151;font-size:14px;line-height:1.6;">Seguimos atentos a ti.</div>`);

  const text = `Hola {{recipientName}}, ¿cómo estás?\n\nPasamos por aquí para acompañarte en este punto de tu proceso.\n\nTu próxima cuota vence en 3 días, y gestionarla a tiempo te permite continuar sin pausas en tu formación, accesos y acompañamiento estratégico.\n\nTe dejamos los enlaces para facilitarte la gestión:\n{{paymentLinks}}\n\nSeguimos atentos a ti.\nEquipo {{appName}}`;

  return { subject, html, text };
}

/* ─── Día -1 ─────────────────────────────────────────────────── */

export function getPaymentDay1BeforeSource() {
  const subject = "Recordatorio importante – continuidad de tu proceso";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}}, esperamos que estés muy bien.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Te recordamos que <b>mañana</b> vence tu cuota correspondiente al programa {{appName}}.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Nuestro objetivo es que puedas seguir avanzando sin interrupciones, manteniendo activos tus accesos, sesiones y acompañamiento.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí te dejamos los enlaces para gestionarlo con facilidad:</div>
        {{paymentLinks}}`);

  const text = `Hola {{recipientName}}, esperamos que estés muy bien.\n\nTe recordamos que mañana vence tu cuota correspondiente al programa {{appName}}.\n\nNuestro objetivo es que puedas seguir avanzando sin interrupciones, manteniendo activos tus accesos, sesiones y acompañamiento.\n\nAquí te dejamos los enlaces para gestionarlo con facilidad:\n{{paymentLinks}}\n\nQuedamos atentos.\nEquipo {{appName}}`;

  return { subject, html, text };
}

/* ─── Día 0 ──────────────────────────────────────────────────── */

export function getPaymentDayOfSource() {
  const subject = "Fecha límite de tu cuota – acción requerida hoy";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}},</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;"><b>Hoy</b> corresponde la fecha límite de pago de tu cuota dentro del programa {{appName}}.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Gestionarlo el día de hoy te permite mantener la continuidad de tu proceso, tus accesos activos y el acompañamiento completo del programa.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Te compartimos los enlaces para realizarlo:</div>
        {{paymentLinks}}`);

  const text = `Hola {{recipientName}},\n\nHoy corresponde la fecha límite de pago de tu cuota dentro del programa {{appName}}.\n\nGestionarlo el día de hoy te permite mantener la continuidad de tu proceso, tus accesos activos y el acompañamiento completo del programa.\n\nTe compartimos los enlaces para realizarlo:\n{{paymentLinks}}\n\nQuedamos atentos.\nEquipo {{appName}}`;

  return { subject, html, text };
}

/* ─── Día +2 ─────────────────────────────────────────────────── */

export function getPaymentDay2AfterSource() {
  const subject = "Retomemos tu proceso en Hotselling";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}}, esperamos que estés muy bien.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos escribirte para acompañarte en este momento de tu proceso dentro de {{appName}}.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando ingresaste al programa, lo hiciste con una intención clara: implementar, avanzar y construir resultados reales.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Actualmente, la cuota pendiente es el único punto que está frenando esa continuidad.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si tu intención sigue siendo avanzar, este paso nos permite seguir acompañándote con normalidad.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí te dejamos los enlaces para regularizarlo y retomar el proceso sin fricciones:</div>
        {{paymentLinks}}`);

  const text = `Hola {{recipientName}}, esperamos que estés muy bien.\n\nQueríamos escribirte para acompañarte en este momento de tu proceso dentro de {{appName}}.\n\nCuando ingresaste al programa, lo hiciste con una intención clara: implementar, avanzar y construir resultados reales.\n\nActualmente, la cuota pendiente es el único punto que está frenando esa continuidad.\n\nSi tu intención sigue siendo avanzar, este paso nos permite seguir acompañándote con normalidad.\n\nAquí te dejamos los enlaces para regularizarlo:\n{{paymentLinks}}\n\nQuedamos atentos.\nEquipo {{appName}}`;

  return { subject, html, text };
}

/* ─── Día +4 ─────────────────────────────────────────────────── */

export function getPaymentDay4AfterSource() {
  const subject = "Sobre la continuidad de tu acompañamiento";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}},</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos compartirte algo importante con total claridad.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">En programas como {{appName}}, las pausas no solo afectan el acceso técnico, sino también el ritmo de implementación, el enfoque estratégico y el acompañamiento continuo que permite ver resultados.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Hoy tu proceso se encuentra detenido únicamente por la cuota pendiente.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Regularizarla te permite:</div>
        <ul style="margin:0 0 14px 18px;padding:0;color:#374151;font-size:14px;line-height:1.8;">
          <li>Mantener tus accesos activos</li>
          <li>Continuar con sesiones y acompañamiento</li>
          <li>No perder el momentum que ya comenzaste a construir</li>
        </ul>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí puedes gestionarlo directamente:</div>
        {{paymentLinks}}
        <div style="margin:14px 0 0 0;color:#374151;font-size:14px;line-height:1.6;">Seguimos atentos a ti.</div>`);

  const text = `Hola {{recipientName}},\n\nQueríamos compartirte algo importante con total claridad.\n\nEn programas como {{appName}}, las pausas no solo afectan el acceso técnico, sino también el ritmo de implementación, el enfoque estratégico y el acompañamiento continuo que permite ver resultados.\n\nHoy tu proceso se encuentra detenido únicamente por la cuota pendiente.\n\nRegularizarla te permite:\n- Mantener tus accesos activos\n- Continuar con sesiones y acompañamiento\n- No perder el momentum que ya comenzaste a construir\n\nAquí puedes gestionarlo directamente:\n{{paymentLinks}}\n\nSeguimos atentos a ti.\nEquipo {{appName}}`;

  return { subject, html, text };
}

/* ─── Día +6 ─────────────────────────────────────────────────── */

export function getPaymentDay6AfterSource() {
  const subject = "Definir el siguiente paso de tu proceso";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}},</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Este mensaje es para ayudarte a definir el siguiente paso de tu proceso dentro de {{appName}}.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Nuestro rol es acompañar a quienes deciden sostener su compromiso con la implementación y el crecimiento.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Para poder seguir haciéndolo, es necesario que la parte operativa esté regularizada.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si deseas continuar con el programa y el acompañamiento, puedes hacerlo gestionando el pago aquí:</div>
        {{paymentLinks}}
        <div style="margin:14px 0 0 0;color:#374151;font-size:14px;line-height:1.6;">En caso contrario, avísanos para registrar correctamente tu estado.</div>`);

  const text = `Hola {{recipientName}},\n\nEste mensaje es para ayudarte a definir el siguiente paso de tu proceso dentro de {{appName}}.\n\nNuestro rol es acompañar a quienes deciden sostener su compromiso con la implementación y el crecimiento.\n\nPara poder seguir haciéndolo, es necesario que la parte operativa esté regularizada.\n\nSi deseas continuar con el programa y el acompañamiento, puedes hacerlo gestionando el pago aquí:\n{{paymentLinks}}\n\nEn caso contrario, avísanos para registrar correctamente tu estado.\n\nQuedamos atentos.\nEquipo {{appName}}`;

  return { subject, html, text };
}

/* ─── Registry ───────────────────────────────────────────────── */

export const PAYMENT_FOLLOWUP_TEMPLATES: PaymentFollowupMeta[] = [
  { day: "-3", key: "pago_dia_m3", name: "Pago: Día -3 (Seguimiento)", description: "Seguimiento consciente – cuota vence en 3 días.", subject: "Seguimiento de tu proceso en Hotselling" },
  { day: "-1", key: "pago_dia_m1", name: "Pago: Día -1 (Preventivo)", description: "Recordatorio preventivo final – vence mañana.", subject: "Recordatorio importante – continuidad de tu proceso" },
  { day: "0", key: "pago_dia_0", name: "Pago: Día 0 (Vencimiento)", description: "Aviso operativo – fecha límite hoy.", subject: "Fecha límite de tu cuota – acción requerida hoy" },
  { day: "+2", key: "pago_dia_p2", name: "Pago: Día +2 (Reencuadre)", description: "Reencuadre del compromiso – post-vencimiento.", subject: "Retomemos tu proceso en Hotselling" },
  { day: "+4", key: "pago_dia_p4", name: "Pago: Día +4 (Costo pausa)", description: "Conciencia del costo de la pausa.", subject: "Sobre la continuidad de tu acompañamiento" },
  { day: "+6", key: "pago_dia_p6", name: "Pago: Día +6 (Cierre)", description: "Elección consciente – cierre elegante.", subject: "Definir el siguiente paso de tu proceso" },
];

const SOURCE_BUILDERS: Record<PaymentFollowupDay, () => { subject: string; html: string; text: string }> = {
  "-3": getPaymentDay3BeforeSource,
  "-1": getPaymentDay1BeforeSource,
  "0": getPaymentDayOfSource,
  "+2": getPaymentDay2AfterSource,
  "+4": getPaymentDay4AfterSource,
  "+6": getPaymentDay6AfterSource,
};

export function getPaymentFollowupSource(day: PaymentFollowupDay) {
  return SOURCE_BUILDERS[day]();
}
