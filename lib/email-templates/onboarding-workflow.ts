/**
 * Workflow de correos de Onboarding – Hotselling PRO.
 * Se disparan después de que el alumno firma el contrato.
 *
 * Variables comunes disponibles:
 *   {{recipientName}}    – Nombre del alumno
 *   {{appName}}          – Nombre de la app (Hotselling)
 *   {{portalLink}}       – URL de ingreso al portal
 *   {{origin}}           – Dominio base
 *
 * Variables específicas de Email 2 (acceso):
 *   {{recipientUsername}} – Usuario de acceso
 *   {{recipientPassword}} – Contraseña
 *   {{coachName}}         – Nombre del coach asignado (si aplica)
 *   {{coachEmail}}        – Email del coach asignado (si aplica)
 */

export type OnboardingStep =
  | "bienvenida"
  | "acceso"
  | "mentalidad"
  | "modulo0"
  | "cierre";

export type OnboardingMeta = {
  step: OnboardingStep;
  key: string;
  name: string;
  description: string;
  subject: string;
};

const HEADER_IMAGE =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotselling PRO – Onboarding</title>
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

function portalButton(label = "Entrar a Hotselling →") {
  return `
        <div style="margin:16px 0;">
          <a href="{{portalLink}}" target="_blank" rel="noreferrer" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">${label}</a>
        </div>`;
}

/* ─── Email 1: Bienvenida (t+0) ──────────────────────────────── */

export function getOnboardingBienvenidaSource() {
  const subject = "🔥 Bienvenido a Hotselling: Esto apenas comienza";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">¡Bienvenido, {{recipientName}}! 🔥</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Acabo de recibir tu contrato y quiero ser el primero en decirte esto:</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;font-style:italic;border-left:3px solid #2563eb;padding-left:12px;">"La decisión que tomaste hoy no es un gasto. Es la mejor inversión que puedes hacer en ti mismo y en tu carrera comercial."</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Estás a punto de entrar a un proceso de formación que no se trata solo de técnicas de venta. Se trata de transformar la forma en que piensas, hablas y te posicionas frente a tus prospectos.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">En los próximos minutos voy a enviarte tus credenciales de acceso para que puedas comenzar de inmediato.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;font-weight:700;">Mientras tanto, te dejo este video de bienvenida 👇🏼</div>
        <div style="margin:0 0 16px 0;">
          <a href="https://www.youtube.com/@JavierQuest" target="_blank" rel="noreferrer" style="display:inline-block;background:#ff0000;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">▶ Ver video de bienvenida</a>
        </div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Esto apenas comienza. Bienvenido al sistema.<br/><br/>Un abrazo,<br/><b>Javier Quest</b><br/><span style="color:#6b7280;font-size:12px;">Fundador de Hotselling PRO</span></div>`);

  const text = `¡Bienvenido, {{recipientName}}! 🔥\n\nAcabo de recibir tu contrato y quiero ser el primero en decirte esto:\n\n"La decisión que tomaste hoy no es un gasto. Es la mejor inversión que puedes hacer en ti mismo y en tu carrera comercial."\n\nEstás a punto de entrar a un proceso de formación que no se trata solo de técnicas de venta. Se trata de transformar la forma en que piensas, hablas y te posicionas frente a tus prospectos.\n\nEn los próximos minutos voy a enviarte tus credenciales de acceso para que puedas comenzar de inmediato.\n\nMientras tanto, te dejo este video de bienvenida:\nhttps://www.youtube.com/@JavierQuest\n\nUn abrazo,\nJavier Quest\nFundador de Hotselling PRO`;

  return { subject, html, text };
}

/* ─── Email 2: Acceso listo (t+5min) ────────────────────────── */

export function getOnboardingAccesoSource() {
  const subject = "🔓 {{recipientName}}, tu acceso está listo → entra aquí";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">{{recipientName}}, ya puedes entrar 🔓</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Tu acceso a <b>Hotselling PRO</b> está activo. Aquí tienes tus credenciales de ingreso:</div>
        <div style="margin:0 0 16px 0;background:#f8faff;border:1px solid #dbeafe;border-radius:8px;padding:14px;">
          <div style="color:#374151;font-size:14px;line-height:1.8;">
            <div><b>🔗 Portal:</b> <a href="{{portalLink}}" style="color:#2563eb;">{{portalLink}}</a></div>
            <div><b>👤 Usuario:</b> {{recipientUsername}}</div>
            <div><b>🔑 Contraseña:</b> {{recipientPassword}}</div>
          </div>
        </div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Te recomiendo cambiar tu contraseña después de tu primer ingreso.</div>
${portalButton("Entrar a Hotselling →")}
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si tienes coach asignado, en breve se pondrá en contacto contigo para coordinar la primera sesión de bienvenida.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">¡Mucho éxito en este camino!<br/><br/>Un abrazo,<br/><b>Equipo Hotselling PRO</b></div>`);

  const text = `{{recipientName}}, ya puedes entrar 🔓\n\nTu acceso a Hotselling PRO está activo.\n\nPortal: {{portalLink}}\nUsuario: {{recipientUsername}}\nContraseña: {{recipientPassword}}\n\nTe recomiendo cambiar tu contraseña después de tu primer ingreso.\n\nSi tienes coach asignado, en breve se pondrá en contacto contigo para coordinar la primera sesión.\n\nUn abrazo,\nEquipo Hotselling PRO`;

  return { subject, html, text };
}

/* ─── Email 3: Mentalidad (t+2h) ─────────────────────────────── */

export function getOnboardingMentalidadSource() {
  const subject = "Si no entiendes esto, nada de lo demás funcionará";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">{{recipientName}}, hay algo que necesitas entender primero 🧠</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Antes de que empieces con los módulos, quiero hablarte de algo que el 90% de los vendedores ignoran — y es exactamente la razón por la que no consiguen resultados consistentes.</div>
        <div style="margin:0 0 14px 0;color:#111827;font-size:15px;line-height:1.5;font-weight:700;">La mentalidad lo es todo.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Las técnicas de cierre, los guiones, las objeciones, todo eso funciona <b>solo cuando</b> tu mente está en el lugar correcto. Sin eso, las herramientas son inútiles.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Lo que aprenderás en Hotselling PRO no es solo cómo vender. Es cómo <b>pensar como un vendedor de alto rendimiento</b>.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;font-weight:700;">¿Ya entraste al portal? Empieza por el Módulo 0 — ahí está la base 👇🏼</div>
${portalButton("Ir al Módulo 0 →")}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Nos vemos adentro.<br/><br/>Un abrazo,<br/><b>Equipo Hotselling PRO</b></div>`);

  const text = `{{recipientName}}, hay algo que necesitas entender primero 🧠\n\nAntes de que empieces con los módulos, quiero hablarte de algo que el 90% de los vendedores ignoran.\n\nLa mentalidad lo es todo.\n\nLas técnicas de cierre, los guiones, las objeciones — todo eso funciona SOLO cuando tu mente está en el lugar correcto.\n\nLo que aprenderás en Hotselling PRO no es solo cómo vender. Es cómo pensar como un vendedor de alto rendimiento.\n\n¿Ya entraste al portal? Empieza por el Módulo 0:\n{{portalLink}}\n\nUn abrazo,\nEquipo Hotselling PRO`;

  return { subject, html, text };
}

/* ─── Email 4: Módulo 0 / Dirección (t+24h) ─────────────────── */

export function getOnboardingModulo0Source() {
  const subject = "Empieza aquí (esto define todo tu proceso)";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">{{recipientName}}, ¿ya completaste el Módulo 0? 🎯</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Han pasado 24 horas desde que te dimos acceso a Hotselling PRO. Quiero asegurarme de que estás arrancando bien.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Si todavía no has empezado el <b>Módulo 0</b>, hazlo hoy. No es un módulo de relleno — es el que te da dirección clara y define cómo vas a abordar todo el proceso.</div>
        <div style="margin:0 0 14px 0;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px;color:#92400e;font-size:13px;line-height:1.6;">
          ⚠️ <b>Importante:</b> Los alumnos que completan el Módulo 0 en las primeras 48 horas tienen resultados significativamente mejores que los que lo dejan para después.
        </div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Entra ahora y empieza 👇🏼</div>
${portalButton("Ir al Módulo 0 →")}
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Cualquier duda, responde este correo o escríbele a tu coach.<br/><br/>Un abrazo,<br/><b>Equipo Hotselling PRO</b></div>`);

  const text = `{{recipientName}}, ¿ya completaste el Módulo 0? 🎯\n\nHan pasado 24 horas desde que te dimos acceso a Hotselling PRO.\n\nSi todavía no has empezado el Módulo 0, hazlo hoy. No es un módulo de relleno — es el que te da dirección clara y define cómo vas a abordar todo el proceso.\n\nImportante: los alumnos que completan el Módulo 0 en las primeras 48h tienen resultados significativamente mejores.\n\nEntra ahora:\n{{portalLink}}\n\nUn abrazo,\nEquipo Hotselling PRO`;

  return { subject, html, text };
}

/* ─── Email 5: Cierre emocional (t+48h) ─────────────────────── */

export function getOnboardingCierreSource() {
  const subject = "Ya estás en el 1% — esto es lo que te diferencia desde hoy";
  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">{{recipientName}}, quiero decirte algo importante 💪🏼</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Han pasado 48 horas desde que firmaste tu contrato y te uniste a Hotselling PRO.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">¿Sabes qué hace diferente a las personas que realmente logran resultados?</div>
        <div style="margin:0 0 14px 0;color:#111827;font-size:15px;line-height:1.5;font-weight:700;font-style:italic;">No esperan el momento perfecto. Empiezan.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Al tomar la decisión que tomaste, ya te posicionaste en el 1% de personas que no solo piensan en mejorar — sino que <b>actúan</b>.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Ahora la pregunta es: ¿Qué vas a hacer con esa ventaja?</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">El portal te está esperando. Tu proceso no termina hasta que tú decides que no termina.</div>
${portalButton("Continuar mi proceso →")}
        <div style="margin:0 0 14px 0;color:#6b7280;font-size:13px;line-height:1.6;">A partir de ahora, el equipo estará disponible para acompañarte en cada paso. No estás solo/a en esto.</div>
        <div style="margin:14px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Sigue adelante.<br/><br/>Un abrazo,<br/><b>Javier Quest</b><br/><span style="color:#6b7280;font-size:12px;">Fundador de Hotselling PRO</span></div>`);

  const text = `{{recipientName}}, quiero decirte algo importante 💪🏼\n\nHan pasado 48 horas desde que firmaste tu contrato y te uniste a Hotselling PRO.\n\n¿Sabes qué hace diferente a las personas que realmente logran resultados?\n\nNo esperan el momento perfecto. Empiezan.\n\nAl tomar la decisión que tomaste, ya te posicionaste en el 1% de personas que no solo piensan en mejorar — sino que actúan.\n\nEl portal te está esperando:\n{{portalLink}}\n\nSigue adelante.\n\nUn abrazo,\nJavier Quest\nFundador de Hotselling PRO`;

  return { subject, html, text };
}

/* ─── Registry ───────────────────────────────────────────────── */

export const ONBOARDING_WORKFLOW_TEMPLATES: OnboardingMeta[] = [
  {
    step: "bienvenida",
    key: "onboarding_bienvenida",
    name: "Onboarding: Bienvenida (t+0)",
    description: "Email inmediato al firmar contrato. Bienvenida emocional + video de Javier.",
    subject: "🔥 Bienvenido a Hotselling: Esto apenas comienza",
  },
  {
    step: "acceso",
    key: "onboarding_acceso",
    name: "Onboarding: Acceso listo (t+5min)",
    description: "Envío de credenciales de acceso al portal.",
    subject: "🔓 {{recipientName}}, tu acceso está listo → entra aquí",
  },
  {
    step: "mentalidad",
    key: "onboarding_mentalidad",
    name: "Onboarding: Mentalidad (t+2h)",
    description: "Primer contenido de valor: base mental del vendedor de alto rendimiento.",
    subject: "Si no entiendes esto, nada de lo demás funcionará",
  },
  {
    step: "modulo0",
    key: "onboarding_modulo0",
    name: "Onboarding: Módulo 0 (t+24h)",
    description: "Activación y dirección clara. Urgencia suave para iniciar el Módulo 0.",
    subject: "Empieza aquí (esto define todo tu proceso)",
  },
  {
    step: "cierre",
    key: "onboarding_cierre",
    name: "Onboarding: Cierre emocional (t+48h)",
    description: "Refuerzo de identidad. El alumno ya está en el 1%.",
    subject: "Ya estás en el 1% — esto es lo que te diferencia desde hoy",
  },
];

const SOURCE_BUILDERS: Record<OnboardingStep, () => { subject: string; html: string; text: string }> = {
  bienvenida: getOnboardingBienvenidaSource,
  acceso: getOnboardingAccesoSource,
  mentalidad: getOnboardingMentalidadSource,
  modulo0: getOnboardingModulo0Source,
  cierre: getOnboardingCierreSource,
};

export function getOnboardingWorkflowSource(step: OnboardingStep) {
  return SOURCE_BUILDERS[step]();
}
