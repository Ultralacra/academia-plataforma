/**
 * Flujo de Accountability – Rescate del Estudiante.
 * Se disparan 10 días antes del cobro de cuota cuando el estudiante está inactivo.
 *
 * Variables comunes disponibles:
 *   {{first_name}}   – Nombre del alumno
 *   {{portalLink}}   – URL de ingreso al portal / chat
 *   {{recipientName}} – Alias de {{first_name}} para compatibilidad
 *
 * Un correo por fase + follow-up (en caso de no abrir el primero):
 *   Fase 1 · Fase 2 · Fase 3 · Fase 5
 */

export type RescateStep =
  | "fase1_email1"
  | "fase1_followup"
  | "fase2_email1"
  | "fase2_followup"
  | "fase3_email1"
  | "fase3_followup"
  | "fase5_email1"
  | "fase5_followup";

export type RescateMeta = {
  step: RescateStep;
  key: string;
  name: string;
  description: string;
  subject: string;
  fase: "1" | "2" | "3" | "5";
  tipo: "email1" | "followup";
};

const HEADER_IMAGE =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotselling – Accountability</title>
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

function chatButton(label: string) {
  return `
        <div style="margin:16px 0;">
          <a href="{{portalLink}}" target="_blank" rel="noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">${label}</a>
        </div>`;
}

/* ─── Fase 1 – Email 1 ──────────────────────────────────────── */

export function getRescateFase1Email1Source() {
  const subject = "¿Cómo te va? queremos saber en qué etapa te encuentras";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 👋</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Lina, nuestra líder de entrega de Hotselling, te dejó un mensaje en tu chat de Space relacionado con tu proceso dentro 👀</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que la <b>Fase 1</b> puede sentirse retadora porque es el momento donde empiezas a tomar decisiones, validar ideas y construir claridad sobre lo que realmente quieres desarrollar.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y justamente por eso queremos saber <b>¿cómo vas?</b></div>
${chatButton("Entra a tu chat en Space y escucha el mensaje →")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando lo escuches, respondenos y cuéntanos cómo vas y qué sientes que necesitas para avanzar más rápido.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 👋\n\nLina, nuestra líder de entrega de Hotselling, te dejó un mensaje en tu chat de Space relacionado con tu proceso dentro 👀\n\nSabemos que la Fase 1 puede sentirse retadora porque es el momento donde empiezas a tomar decisiones, validar ideas y construir claridad sobre lo que realmente quieres desarrollar.\n\nY justamente por eso queremos saber ¿cómo vas?\n\nEntra a tu chat en Space y escucha el mensaje que Lina dejó para ti:\n{{portalLink}}\n\nCuando lo escuches, respondenos y cuéntanos cómo vas y qué sientes que necesitas para avanzar más rápido.\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 1 – Follow-up ────────────────────────────────────── */

export function getRescateFase1FollowupSource() {
  const subject = "Solo queremos acompañarte en tu proceso";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 🙌</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Estamos de vuelta por aquí porque vimos que aún no has escuchado el mensaje que Lina dejó para ti en Space.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que al inicio del proceso pueden aparecer dudas, bloqueos o incluso momentos donde uno siente que todavía está intentando encontrar claridad.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pero justamente por eso queremos acompañarte y entender cómo vas realmente.</div>
${chatButton("👉 Entra a tu chat y escucha el mensaje que Lina te dejó")}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 🙌\n\nEstamos de vuelta por aquí porque vimos que aún no has escuchado el mensaje que Lina dejó para ti en Space.\n\nSabemos que al inicio del proceso pueden aparecer dudas, bloqueos o incluso momentos donde uno siente que todavía está intentando encontrar claridad.\n\nPero justamente por eso queremos acompañarte y entender cómo vas realmente.\n\n👉 Entra a tu chat y escucha el mensaje que Lina te dejó:\n{{portalLink}}\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 2 – Email 1 ──────────────────────────────────────── */

export function getRescateFase2Email1Source() {
  const subject = "Queremos saber cómo vas en esta primera etapa";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 👋</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Vimos que llevas algunos días sin actividad y Lina, líder de entrega de Hotselling, quiso dejarte un mensaje relacionado con la etapa en la que te encuentras actualmente.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que la <b>Fase 2</b> suele ser una etapa muy transformadora, pero también una de las más retadoras, porque es donde comienzas a consolidar realmente tu ecosistema y materializar tu negocio.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Por eso queremos saber cómo vas y si hay algo que esté frenando tu progreso.</div>
${chatButton("Entra a tu chat de Space y escucha el mensaje que Lina dejó para ti →")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando lo escuches, respóndenos contándonos cómo vas y cómo podemos ayudarte.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 👋\n\nVimos que llevas algunos días sin actividad y Lina, líder de entrega de Hotselling, quiso dejarte un mensaje relacionado con la etapa en la que te encuentras actualmente.\n\nSabemos que la Fase 2 suele ser una etapa muy transformadora, pero también una de las más retadoras, porque es donde comienzas a consolidar realmente tu ecosistema y materializar tu negocio.\n\nPor eso queremos saber cómo vas y si hay algo que esté frenando tu progreso.\n\nEntra a tu chat de Space y escucha el mensaje que Lina dejó para ti:\n{{portalLink}}\n\nCuando lo escuches, respóndenos contándonos cómo vas y cómo podemos ayudarte.\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 2 – Follow-up ────────────────────────────────────── */

export function getRescateFase2FollowupSource() {
  const subject = "Queremos ayudarte a avanzar";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 🙌</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos volver a escribirte porque aún no hemos sabido de ti y Lina te dejó un mensaje importante en tu chat de Space.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">A veces esta etapa del proceso puede sentirse pesada o abrumadora porque empiezas a ensamblar muchas piezas al mismo tiempo, pero justamente por eso queremos acompañarte y ayudarte a avanzar con mayor claridad.</div>
${chatButton("👉 Entra a tu chat y escucha el mensaje que Lina dejó para ti")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Te estaremos esperando por allí 🙌</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 🙌\n\nQueríamos volver a escribirte porque aún no hemos sabido de ti y Lina te dejó un mensaje importante en tu chat de Space.\n\nA veces esta etapa del proceso puede sentirse pesada o abrumadora porque empiezas a ensamblar muchas piezas al mismo tiempo, pero justamente por eso queremos acompañarte y ayudarte a avanzar con mayor claridad.\n\n👉 Entra a tu chat y escucha el mensaje que Lina dejó para ti:\n{{portalLink}}\n\nTe estaremos esperando por allí 🙌\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 3 – Email 1 ──────────────────────────────────────── */

export function getRescateFase3Email1Source() {
  const subject = "¡Queremos saber de ti! ¿cómo te va?";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 👋</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Lina te dejó un mensaje en tu chat de Space relacionado con la etapa en la que te encuentras actualmente 👀</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">La <b>Fase 3</b>, sin duda, es una etapa muy importante porque es donde finalmente empiezas a salir al mercado, lanzar campañas y comenzar a validar con data real.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y justamente por eso queremos saber si ya lograste salir al mercado y cómo te va.</div>
${chatButton("Entra a tu chat de Space y escucha el mensaje que Lina dejó para ti 🙌")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando lo escuches, respóndenos y cuéntanos cómo vas.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 👋\n\nLina te dejó un mensaje en tu chat de Space relacionado con la etapa en la que te encuentras actualmente 👀\n\nLa Fase 3, sin duda, es una etapa muy importante porque es donde finalmente empiezas a salir al mercado, lanzar campañas y comenzar a validar con data real.\n\nY justamente por eso queremos saber si ya lograste salir al mercado y cómo te va.\n\nEntra a tu chat de Space y escucha el mensaje que Lina dejó para ti:\n{{portalLink}}\n\nCuando lo escuches, respóndenos y cuéntanos cómo vas.\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 3 – Follow-up ────────────────────────────────────── */

export function getRescateFase3FollowupSource() {
  const subject = "A veces el resultado está más cerca de lo que crees 👀";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 🙌</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos volver a escribirte porque vimos que aún no has escuchado el mensaje que Lina dejó para ti en Space.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que salir al mercado puede generar muchas emociones: expectativa, miedo, presión o incluso dudas sobre si realmente estás listo.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pero muchas veces el siguiente resultado llega justamente cuando damos ese paso de implementación y acción.</div>
${chatButton("👉 Entra a tu chat y escucha el mensaje que Lina te dejó")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queremos acompañarte y ayudarte a avanzar 🙌</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 🙌\n\nQueríamos volver a escribirte porque vimos que aún no has escuchado el mensaje que Lina dejó para ti en Space.\n\nSabemos que salir al mercado puede generar muchas emociones: expectativa, miedo, presión o incluso dudas sobre si realmente estás listo.\n\nPero muchas veces el siguiente resultado llega justamente cuando damos ese paso de implementación y acción.\n\n👉 Entra a tu chat y escucha el mensaje que Lina te dejó:\n{{portalLink}}\n\nQueremos acompañarte y ayudarte a avanzar 🙌\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 5 – Email 1 ──────────────────────────────────────── */

export function getRescateFase5Email1Source() {
  const subject = "¡Estás muy cerca de la meta!, queremos saber ¿cómo te va?";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 👋</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Vimos que llevas algunos días sin actividad dentro del programa y Lina, líder de entrega de Hotselling, quiso dejarte un mensaje relacionado con la etapa en la que te encuentras actualmente 👀</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que la <b>Fase 5</b> puede ser una de las etapas más retadoras del proceso: optimizar, analizar datos, sostener campañas y pensar en trascendencia al mismo tiempo no siempre es sencillo.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Por eso queremos saber cómo vas realmente y cómo podemos ayudarte a avanzar.</div>
${chatButton("👉 Entra a tu chat en Space y escucha el mensaje que Lina dejó para ti")}
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando lo escuches, respóndenos por el chat contándonos:</div>
        <ul style="margin:0 0 14px 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
          <li>cómo te has sentido,</li>
          <li>en qué punto estás,</li>
          <li>o si hay algo frenando tu avance actualmente.</li>
        </ul>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Estamos aquí para ayudarte 🙌</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 👋\n\nVimos que llevas algunos días sin actividad dentro del programa y Lina, líder de entrega de Hotselling, quiso dejarte un mensaje relacionado con la etapa en la que te encuentras actualmente 👀\n\nSabemos que la Fase 5 puede ser una de las etapas más retadoras del proceso: optimizar, analizar datos, sostener campañas y pensar en trascendencia al mismo tiempo no siempre es sencillo.\n\nPor eso queremos saber cómo vas realmente y cómo podemos ayudarte a avanzar.\n\n👉 Entra a tu chat en Space y escucha el mensaje que Lina dejó para ti:\n{{portalLink}}\n\nCuando lo escuches, respóndenos por el chat contándonos:\n- cómo te has sentido,\n- en qué punto estás,\n- o si hay algo frenando tu avance actualmente.\n\nEstamos aquí para ayudarte 🙌\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Fase 5 – Follow-up ────────────────────────────────────── */

export function getRescateFase5FollowupSource() {
  const subject = "Solo queremos saber cómo vas";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{first_name}} 🙌</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Queríamos volver a escribirte porque vimos que aún no has escuchado el mensaje que Lina te dejó en tu chat de Space.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que a veces el proceso, el negocio o incluso el día a día pueden hacer que uno se desconecte un poco, especialmente en una etapa tan desafiante como la que estás viviendo actualmente.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pero justamente por eso queremos acompañarte y entender:</div>
        <ul style="margin:0 0 14px 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
          <li>👉 cómo vas,</li>
          <li>👉 qué está pasando,</li>
          <li>👉 y cómo podemos ayudarte a retomar fuerza y claridad.</li>
        </ul>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cuando puedas, entra a tu chat y escucha el mensaje que dejó Lina para ti 🙌</div>
${chatButton("Escucha ahora")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Te estaremos esperando por allí.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Equipo Hotselling</b></div>`);

  const text = `Hola {{first_name}} 🙌\n\nQueríamos volver a escribirte porque vimos que aún no has escuchado el mensaje que Lina te dejó en tu chat de Space.\n\nSabemos que a veces el proceso, el negocio o incluso el día a día pueden hacer que uno se desconecte un poco, especialmente en una etapa tan desafiante como la que estás viviendo actualmente.\n\nPero justamente por eso queremos acompañarte y entender:\n\n👉 cómo vas,\n👉 qué está pasando,\n👉 y cómo podemos ayudarte a retomar fuerza y claridad.\n\nCuando puedas, entra a tu chat y escucha el mensaje que dejó Lina para ti:\n{{portalLink}}\n\nTe estaremos esperando por allí.\n\nUn abrazo,\nEquipo Hotselling`;

  return { subject, html, text };
}

/* ─── Dispatcher ─────────────────────────────────────────────── */

export function getRescateSource(step: RescateStep) {
  switch (step) {
    case "fase1_email1":  return getRescateFase1Email1Source();
    case "fase1_followup": return getRescateFase1FollowupSource();
    case "fase2_email1":  return getRescateFase2Email1Source();
    case "fase2_followup": return getRescateFase2FollowupSource();
    case "fase3_email1":  return getRescateFase3Email1Source();
    case "fase3_followup": return getRescateFase3FollowupSource();
    case "fase5_email1":  return getRescateFase5Email1Source();
    case "fase5_followup": return getRescateFase5FollowupSource();
    default:
      throw new Error(`Rescate step desconocido: ${step}`);
  }
}

/* ─── Registry ───────────────────────────────────────────────── */

export const RESCATE_TEMPLATES: RescateMeta[] = [
  {
    step: "fase1_email1",
    key: "rescate_fase1_email1",
    name: "Rescate Fase 1 – Email inicial",
    description: "Email de apertura para estudiantes en Fase 1 inactivos. Invita a escuchar mensaje de Lina en Space.",
    subject: "¿Cómo te va? queremos saber en qué etapa te encuentras",
    fase: "1",
    tipo: "email1",
  },
  {
    step: "fase1_followup",
    key: "rescate_fase1_followup",
    name: "Rescate Fase 1 – Follow-up",
    description: "Follow-up si el alumno no abrió el primer correo de Fase 1.",
    subject: "Solo queremos acompañarte en tu proceso",
    fase: "1",
    tipo: "followup",
  },
  {
    step: "fase2_email1",
    key: "rescate_fase2_email1",
    name: "Rescate Fase 2 – Email inicial",
    description: "Email de apertura para estudiantes en Fase 2 inactivos. Invita a escuchar mensaje de Lina en Space.",
    subject: "Queremos saber cómo vas en esta primera etapa",
    fase: "2",
    tipo: "email1",
  },
  {
    step: "fase2_followup",
    key: "rescate_fase2_followup",
    name: "Rescate Fase 2 – Follow-up",
    description: "Follow-up si el alumno no abrió el primer correo de Fase 2.",
    subject: "Queremos ayudarte a avanzar",
    fase: "2",
    tipo: "followup",
  },
  {
    step: "fase3_email1",
    key: "rescate_fase3_email1",
    name: "Rescate Fase 3 – Email inicial",
    description: "Email de apertura para estudiantes en Fase 3 inactivos. Invita a escuchar mensaje de Lina en Space.",
    subject: "¡Queremos saber de ti! ¿cómo te va?",
    fase: "3",
    tipo: "email1",
  },
  {
    step: "fase3_followup",
    key: "rescate_fase3_followup",
    name: "Rescate Fase 3 – Follow-up",
    description: "Follow-up si el alumno no abrió el primer correo de Fase 3.",
    subject: "A veces el resultado está más cerca de lo que crees 👀",
    fase: "3",
    tipo: "followup",
  },
  {
    step: "fase5_email1",
    key: "rescate_fase5_email1",
    name: "Rescate Fase 5 – Email inicial",
    description: "Email de apertura para estudiantes en Fase 5 inactivos. Invita a escuchar mensaje de Lina en Space.",
    subject: "¡Estás muy cerca de la meta!, queremos saber ¿cómo te va?",
    fase: "5",
    tipo: "email1",
  },
  {
    step: "fase5_followup",
    key: "rescate_fase5_followup",
    name: "Rescate Fase 5 – Follow-up",
    description: "Follow-up si el alumno no abrió el primer correo de Fase 5.",
    subject: "Solo queremos saber cómo vas",
    fase: "5",
    tipo: "followup",
  },
];
