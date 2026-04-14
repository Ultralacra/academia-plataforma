/**
 * Workflow de correos de Onboarding – Hotselling Starter.
 * Se disparan después de que el alumno firma contrato y valida el pago.
 *
 * Variables comunes disponibles:
 *   {{recipientName}}    – Nombre del alumno
 *   {{appName}}          – Nombre de la app (Hotselling)
 *   {{portalLink}}       – URL de ingreso al portal
 *   {{origin}}           – Dominio base
 *
 * Variables específicas de Email 2 (accesos):
 *   {{skoolLink}}        – Enlace de acceso a Skool
 *   {{notionLink}}       – Enlace de acceso a Notion
 */

export type StarterStep =
  | "bienvenida"
  | "acceso"
  | "metodologia"
  | "cierre";

export type StarterMeta = {
  step: StarterStep;
  key: string;
  name: string;
  description: string;
  subject: string;
};

const HEADER_IMAGE =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

const SOPORTE_WHATSAPP = "https://wa.link/9ojq40";

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotselling Starter – Onboarding</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e7e9f0;border-radius:12px;overflow:hidden;">
      <div style="padding:0;">
        <img src="${HEADER_IMAGE}" alt="Hotselling" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
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

/* ─── Email 1: Bienvenida + Autoridad (t+0) ─────────────────── */

export function getStarterBienvenidaSource() {
  const subject = "Bienvenido a Hotselling Starter 🔥 (esto es lo que sigue)";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}},</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Bienvenido oficialmente a <b>Hotselling Starter</b> 🔥</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Acabas de dar un paso importante.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">El 99% de las personas en este mercado se quedan consumiendo contenido sin dirección…</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pero tú decidiste hacer algo diferente: <b>Construir con estrategia.</b></div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y para hacerlo, es necesario que tengas total claridad de lo que estás por empezar, revisando por completo este mensaje de Javier 👇</div>
        <div style="margin:0 0 16px 0;background:#f8faff;border:1px solid #dbeafe;border-radius:8px;padding:16px;text-align:center;">
          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Video de bienvenida — Javier Quest</div>
          <a href="https://www.youtube.com/@JavierQuest" target="_blank" rel="noreferrer" style="display:inline-block;background:#ff0000;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">▶ Ver video de Javier</a>
        </div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Recuerda, este programa está diseñado para que avances con estructura, enfoque y ejecución a tu propio ritmo.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Nos vemos dentro,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{recipientName}},\n\nBienvenido oficialmente a Hotselling Starter 🔥\n\nAcabas de dar un paso importante.\n\nEl 99% de las personas en este mercado se quedan consumiendo contenido sin dirección… Pero tú decidiste hacer algo diferente: Construir con estrategia.\n\nY para hacerlo, es necesario que tengas total claridad de lo que estás por empezar, revisando por completo este mensaje de Javier:\nhttps://www.youtube.com/@JavierQuest\n\nRecuerda, este programa está diseñado para que avances con estructura, enfoque y ejecución a tu propio ritmo.\n\nNos vemos dentro,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Email 2: Accesos + Activación (t+5min) ─────────────────── */

export function getStarterAccesoSource() {
  const subject = "🔓 Tus accesos están listos (entra ahora)";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Ahora sí {{recipientName}}, ya tienes todo listo para comenzar.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí están tus accesos 👇</div>
        <div style="margin:0 0 16px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;">
          <div style="color:#374151;font-size:14px;line-height:2.0;">
            <div>✅ <b>Acceso a Skool:</b> <a href="{{skoolLink}}" target="_blank" rel="noreferrer" style="color:#2563eb;">{{skoolLink}}</a></div>
            <div>✅ <b>Acceso a Notion:</b> <a href="{{notionLink}}" target="_blank" rel="noreferrer" style="color:#2563eb;">{{notionLink}}</a></div>
          </div>
        </div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">👉 <b>Recomendación importante:</b> Entra ahora mismo y asegúrate de tener esos links siempre a la mano.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Por estadística, hemos constatado que las personas que empiezan de inmediato son las que realmente avanzan y llegan al resultado final.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Si necesitas ayuda con tus accesos, puedes escribirnos aquí:</div>
        <div style="margin:0 0 16px 0;">
          <a href="${SOPORTE_WHATSAPP}" target="_blank" rel="noreferrer" style="display:inline-block;background:#25d366;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">💬 Soporte por WhatsApp</a>
        </div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Nos vemos dentro 🚀<br/><br/><b>Equipo Hotselling</b></div>`);

  const text = `Ahora sí {{recipientName}}, ya tienes todo listo para comenzar.\n\nAquí están tus accesos:\n✅ Acceso a Skool: {{skoolLink}}\n✅ Acceso a Notion: {{notionLink}}\n\nRecomendación importante: Entra ahora mismo y asegúrate de tener esos links siempre a la mano.\n\nPor estadística, hemos constatado que las personas que empiezan de inmediato son las que realmente avanzan y llegan al resultado final.\n\nSi necesitas ayuda con tus accesos, puedes escribirnos aquí:\n${SOPORTE_WHATSAPP}\n\nNos vemos dentro 🚀\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Email 3: Metodología (Lina) + Dirección (t+2h) ────────── */

export function getStarterMetodologiaSource() {
  const subject = "Antes de avanzar, entiende esto sobre cómo funciona";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Muy bien {{recipientName}},</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Antes de avanzar, hay algo clave que necesitas entender:</div>
        <div style="margin:0 0 14px 0;color:#111827;font-size:15px;line-height:1.5;font-weight:700;">Este programa tiene un orden y estrategia clave para el éxito.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y seguirlo te permitirá lograr los resultados (En tiempo récord además)…</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Para eso, <b>Lina</b> — Nuestra líder de Delivery — te preparó un video donde explica exactamente cómo funciona la metodología y cómo debes recorrer el programa. Míralo hasta el final 👇</div>
        <div style="margin:0 0 16px 0;background:#f8faff;border:1px solid #dbeafe;border-radius:8px;padding:16px;text-align:center;">
          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Video de metodología — Lina (Líder de Delivery)</div>
          <a href="{{portalLink}}" target="_blank" rel="noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">▶ Ver video de Lina</a>
        </div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">👉 Tras verlo, empieza por aquí:</div>
        <div style="margin:0 0 14px 0;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px;color:#92400e;font-size:13px;font-weight:700;">
          📌 Módulo 0 — ONBOARDING
        </div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Ahí tendrás la claridad completa para avanzar paso a paso por el programa.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y recuerda: Es clave, para tu éxito, que <b>NO te saltes este punto</b> (Ni ningún otro).</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Nos vemos dentro,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Muy bien {{recipientName}},\n\nAntes de avanzar, hay algo clave que necesitas entender:\n\nEste programa tiene un orden y estrategia clave para el éxito. Y seguirlo te permitirá lograr los resultados (En tiempo récord además).\n\nPara eso, Lina — Nuestra líder de Delivery — te preparó un video donde explica exactamente cómo funciona la metodología y cómo debes recorrer el programa. Míralo hasta el final.\n\nTras verlo, empieza por aquí:\nMódulo 0 — ONBOARDING\n\nAhí tendrás la claridad completa para avanzar paso a paso por el programa.\n\nY recuerda: Es clave, para tu éxito, que NO te saltes este punto (Ni ningún otro).\n\nNos vemos dentro,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Email 4: Cierre + Expectativas claras (t+24h) ─────────── */

export function getStarterCierreSource() {
  const subject = "Tu éxito con este programa depende de 1 sola cosa (Esta)";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}},</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queremos dejarte algo muy claro desde el inicio:</div>
        <div style="margin:0 0 14px 0;color:#111827;font-size:15px;line-height:1.5;font-weight:700;font-style:italic;">Este programa está diseñado para personas que ejecutan.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Aquí tienes la estrategia, la estructura y el paso a paso.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Ahora bien, los resultados llegarán, por supuesto, de <b>tu implementación.</b></div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">El objetivo es que desarrolles un conjunto de habilidades clave: Integrar, avanzar y ejecutar.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Si lo haces, inevitablemente avanzarás.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y si avanzas, inevitablemente tus resultados llegarán.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Es así de sencillo, ese es el poder de estar en un programa tan sólido y validado como este.</div>
        <div style="margin:0 0 16px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;color:#166534;font-size:14px;line-height:1.6;">
          Tienes todo lo necesario, <b>el poder está en tus manos.</b><br/>
          Contamos contigo para hacerlo realidad.
        </div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">🔥 Vamos con todo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{recipientName}},\n\nQueremos dejarte algo muy claro desde el inicio:\n\nEste programa está diseñado para personas que ejecutan.\n\nAquí tienes la estrategia, la estructura y el paso a paso.\n\nAhora bien, los resultados llegarán, por supuesto, de tu implementación.\n\nEl objetivo es que desarrolles un conjunto de habilidades clave: Integrar, avanzar y ejecutar.\n\nSi lo haces, inevitablemente avanzarás.\nY si avanzas, inevitablemente tus resultados llegarán.\n\nEs así de sencillo, ese es el poder de estar en un programa tan sólido y validado como este.\n\nTienes todo lo necesario, el poder está en tus manos.\nContamos contigo para hacerlo realidad.\n\n🔥 Vamos con todo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Registry ───────────────────────────────────────────────── */

export const STARTER_WORKFLOW_TEMPLATES: StarterMeta[] = [
  {
    step: "bienvenida",
    key: "starter_bienvenida",
    name: "Starter: Bienvenida + Autoridad (t+0)",
    description: "Email inmediato al firmar contrato. Bienvenida emocional + video de Javier.",
    subject: "Bienvenido a Hotselling Starter 🔥 (esto es lo que sigue)",
  },
  {
    step: "acceso",
    key: "starter_acceso",
    name: "Starter: Accesos listos (t+5min)",
    description: "Envío de accesos a Skool y Notion con soporte por WhatsApp.",
    subject: "🔓 Tus accesos están listos (entra ahora)",
  },
  {
    step: "metodologia",
    key: "starter_metodologia",
    name: "Starter: Metodología Lina (t+2h)",
    description: "Video de metodología con Lina y dirección al Módulo 0.",
    subject: "Antes de avanzar, entiende esto sobre cómo funciona",
  },
  {
    step: "cierre",
    key: "starter_cierre",
    name: "Starter: Cierre + Expectativas (t+24h)",
    description: "Expectativas claras: el éxito depende de la ejecución del alumno.",
    subject: "Tu éxito con este programa depende de 1 sola cosa (Esta)",
  },
];

const SOURCE_BUILDERS: Record<StarterStep, () => { subject: string; html: string; text: string }> = {
  bienvenida: getStarterBienvenidaSource,
  acceso: getStarterAccesoSource,
  metodologia: getStarterMetodologiaSource,
  cierre: getStarterCierreSource,
};

export function getStarterWorkflowSource(step: StarterStep) {
  return SOURCE_BUILDERS[step]();
}
