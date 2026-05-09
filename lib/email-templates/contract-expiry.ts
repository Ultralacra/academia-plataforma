/**
 * Plantillas de notificación para contratos / membresías próximos a vencer.
 *
 * Variables disponibles:
 *   {{recipientName}}  – Nombre del alumno
 *   {{appName}}        – Nombre de la app (Hotselling)
 *
 * CTA fijo: https://wa.link/zuyksg
 */

export type ContractExpiryKey =
  | "contrato_por_vencer_15d"
  | "contrato_completado_5d"
  | "membresia_por_vencer_10d";

export type ContractExpiryMeta = {
  key: ContractExpiryKey;
  name: string;
  description: string;
  subject: string;
};

const HEADER_IMAGE =
  "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

export const CONTRACT_WHATSAPP_LINK = "https://wa.link/zuyksg";

function wrap(bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hotselling</title>
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

function ctaButton(label: string) {
  return `
        <div style="margin:16px 0;">
          <a href="${CONTRACT_WHATSAPP_LINK}" target="_blank" rel="noreferrer" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:14px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">${label}</a>
        </div>`;
}

/* ─── Correo 1: Contrato por vencer (15 días antes) ─────────── */

export function getContractoPorVencer15dSource() {
  const subject = "Si deseas continuar avanzando con nosotros ¡Haz clic aquí!";

  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">¡Quiero felicitarte! por todo lo que has venido haciendo en Hotselling.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y porque realmente espero poder seguir acompañándote junto con mi equipo, si así lo deseas, es importante tener en cuenta que:</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">En unos días tu proceso actual dentro del programa finaliza, y es un momento clave para decidir:</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">👉 Si deseas continuar avanzando con acompañamiento o si deseas seguir construyendo sobre lo que ya avanzaste.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sé que cada estudiante vive este proceso distinto, y por eso quería escribirte antes de que esta etapa cierre.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Porque no se trata solo de lo que ya aprendiste…</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">👉 se trata de lo que todavía puedes ejecutar con soporte, feedback y guía.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Si estás evaluando continuar o quieres entender cómo seguir sin perder el ritmo, mi equipo está listo para asesorarte:</div>
        <div style="margin:0 0 2px 0;color:#374151;font-size:14px;line-height:1.6;font-weight:700;">👉 Escríbenos aquí y te ayudamos a ver tu siguiente paso:</div>
${ctaButton("Escríbenos aquí 👇🏼")}
        <div style="margin:16px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\n¡Quiero felicitarte! por todo lo que has venido haciendo en Hotselling.\n\nY porque realmente espero poder seguir acompañándote junto con mi equipo, si así lo deseas, es importante tener en cuenta que:\n\nEn unos días tu proceso actual dentro del programa finaliza, y es un momento clave para decidir:\n\n👉 Si deseas continuar avanzando con acompañamiento o si deseas seguir construyendo sobre lo que ya avanzaste.\n\nSé que cada estudiante vive este proceso distinto, y por eso quería escribirte antes de que esta etapa cierre.\n\nPortque no se trata solo de lo que ya aprendiste…\n\n👉 se trata de lo que todavía puedes ejecutar con soporte, feedback y guía.\n\nSi estás evaluando continuar o quieres entender cómo seguir sin perder el ritmo, mi equipo está listo para asesorarte:\n\n👉 Escríbenos aquí y te ayudamos a ver tu siguiente paso.\n\nUn abrazo,\nJavier Quest`;

  return { subject, html, text };
}

/* ─── Correo 2: Contrato completado / post-vencimiento ──────── */

export function getContratoCompletado5dSource() {
  const subject = "¡Lo que lograste hasta hoy, merece ser celebrado!";

  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋🏻</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">¡Ha sido un gusto haberte acompañado!</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Tu acceso al programa ha finalizado, y con esto cerramos esta etapa de tu proceso.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Pero, quiero que te lleves algo claro:</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;font-weight:700;">¡Lo que lograste hasta hoy merece ser reconocido y celebrado!</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Cada avance, cada aprendizaje y cada paso que diste forma parte de lo que puedes seguir desarrollando en cualquier momento.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sabemos que cada proceso tiene sus tiempos, y está bien si ahora decides pausar.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">De nuestra parte, ha sido un gusto acompañarte hasta aquí.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y si más adelante decides retomar,</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;font-weight:700;">Mi equipo estará listo para asistirte y ayudarte con el siguiente paso:</div>
${ctaButton("Contáctanos aquí 👇🏼")}
        <div style="margin:16px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Nos vemos en el camino,<br/><b>Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋🏻\n\n¡Ha sido un gusto haberte acompañado!\n\nTu acceso al programa ha finalizado, y con esto cerramos esta etapa de tu proceso.\n\nPero, quiero que te lleves algo claro:\n\n¡Lo que lograste hasta hoy merece ser reconocido y celebrado!\n\nCada avance, cada aprendizaje y cada paso que diste forma parte de lo que puedes seguir desarrollando en cualquier momento.\n\nSabemos que cada proceso tiene sus tiempos, y está bien si ahora decides pausar.\n\nDe nuestra parte, ha sido un gusto acompañarte hasta aquí.\n\nY si más adelante decides retomar, mi equipo estará listo para asistirte y ayudarte con el siguiente paso.\n\nNos vemos en el camino,\nJavier Quest`;

  return { subject, html, text };
}

/* ─── Correo 3: Membresía por vencer (10 días antes) ────────── */

export function getMembresiaPorVencer10dSource() {
  const subject = "¡Hora de tomar acción! tu membresía está por expirar";

  const html = wrap(`
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">Hola {{recipientName}} 👋</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">En Hotselling nos apasiona acompañar a estudiantes como tú a conseguir sus metas, es por eso que decidí escribirte.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Y como tu membresía está próxima a expirar, quería recordarte que, si deseas seguir avanzando con acompañamiento, soporte y seguimiento dentro del programa, puedes renovar tu acceso y continuar tu proceso con nosotros.</div>
        <div style="margin:0 0 14px 0;color:#374151;font-size:14px;line-height:1.6;">Sé que cada estudiante vive este camino distinto, pero algo que he visto muchas veces es que, quienes más resultados consolidan son los que permanecen en constante movimiento y ejecución.</div>
        <div style="margin:0 0 6px 0;color:#374151;font-size:14px;line-height:1.6;">Si sientes que aún hay cosas que quieres construir, ajustar o terminar de implementar, escríbenos aquí para ayudarte.</div>
${ctaButton("Escríbenos aquí 👇🏼")}
        <div style="margin:16px 0 0 0;color:#111827;font-size:14px;line-height:1.6;">Un abrazo,<br/><b>Javier Quest</b></div>`);

  const text = `Hola {{recipientName}} 👋\n\nEn Hotselling nos apasiona acompañar a estudiantes como tú a conseguir sus metas, es por eso que decidí escribirte.\n\nY como tu membresía está próxima a expirar, quería recordarte que, si deseas seguir avanzando con acompañamiento, soporte y seguimiento dentro del programa, puedes renovar tu acceso y continuar tu proceso con nosotros.\n\nSé que cada estudiante vive este camino distinto, pero algo que he visto muchas veces es que, quienes más resultados consolidan son los que permanecen en constante movimiento y ejecución.\n\nSi sientes que aún hay cosas que quieres construir, ajustar o terminar de implementar, escríbenos aquí para ayudarte.\n\nUn abrazo,\nJavier Quest`;

  return { subject, html, text };
}

/* ─── Registry ───────────────────────────────────────────────── */

export const CONTRACT_EXPIRY_TEMPLATES: ContractExpiryMeta[] = [
  {
    key: "contrato_por_vencer_15d",
    name: "Contrato: Por vencer (15 días)",
    description: "Enviar 15 días antes del vencimiento del contrato. CTA → WhatsApp ATC.",
    subject: "Si deseas continuar avanzando con nosotros ¡Haz clic aquí!",
  },
  {
    key: "contrato_completado_5d",
    name: "Contrato: Completado / Post-vencimiento",
    description: "Enviar cuando el alumno pasa a Completado (≥5 días post-vencimiento). CTA → WhatsApp ATC.",
    subject: "¡Lo que lograste hasta hoy, merece ser celebrado!",
  },
  {
    key: "membresia_por_vencer_10d",
    name: "Membresía: Por vencer (10 días)",
    description: "Enviar 10 días antes del vencimiento de la membresía. CTA → WhatsApp ATC.",
    subject: "¡Hora de tomar acción! tu membresía está por expirar",
  },
];

const SOURCE_BUILDERS: Record<ContractExpiryKey, () => { subject: string; html: string; text: string }> = {
  contrato_por_vencer_15d: getContractoPorVencer15dSource,
  contrato_completado_5d: getContratoCompletado5dSource,
  membresia_por_vencer_10d: getMembresiaPorVencer10dSource,
};

export function getContractExpirySource(key: ContractExpiryKey) {
  return SOURCE_BUILDERS[key]();
}
