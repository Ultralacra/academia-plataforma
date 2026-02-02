export type PaymentReminderParams = {
  appName?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  origin?: string;
  portalLink?: string | null;
  cuotaCodigo?: string | null;
  dueDate?: string | null; // yyyy-mm-dd or human string
  amount?: number | string | null;
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

export function buildPaymentReminderEmail(params: PaymentReminderParams) {
  const appName = params.appName?.trim() || "Hotselling";
  const recipientName = (params.recipientName ?? "").trim();
  const cuota = params.cuotaCodigo ? esc(String(params.cuotaCodigo)) : "la cuota";
  const dueDate = params.dueDate ? esc(String(params.dueDate)) : "próximo vencimiento";
  const amount = params.amount != null ? esc(String(params.amount)) : "el monto correspondiente";
  const origin = params.origin?.trim() || "https://academia.valinkgroup.com";
  const portalLink = (params.portalLink ?? "").trim();
  const headerImageUrl =
    params.headerImageUrl?.trim() ||
    "https://lh7-rt.googleusercontent.com/formsz/AN7BsVB-Wa3fKYj_AvJ3YeN6LgBoJR_7Z_naS38QtK0tFYWUdxcttbfYAyX9imwGo2SxxvDo_i2YTHf1cNor7YHJ7k-0UybCeFOolee50-XsCtfAcjzdQts9YycLL6BNWAnMeSDEQ9q8ayR2_H8v3Rl1XxvXbYMFs2at8Yn7MQ1ezf5Vl9I4etpXtbPqddQLwzvs_aYae0RHyqTYs8Dg=w1917?key=vtGBMFfrQpztwyEWSjKe0Q";

  const subject = `Recordatorio de pago: ${cuota} vence ${dueDate}`;

  const computedPortalLink = portalLink
    ? portalLink
    : origin
    ? `${origin.replace(/\/$/, "")}/login`
    : "";

  const greeting = recipientName ? `Hola ${esc(recipientName)}` : "Hola hotseller";

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
        ${headerImageUrl ? `<img src="${esc(headerImageUrl)}" alt="Encabezado" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;"/>` : ""}
      </div>
      <div style="padding:22px;">
        <div style="margin:0 0 6px 0;color:#111827;font-size:16px;line-height:1.5;font-weight:800;">${greeting},</div>
        <div style="margin:0;color:#374151;font-size:14px;line-height:1.6;">Te escribimos para recordarte que <b>${cuota}</b> por un total de <b>${amount}</b> vence el <b>${dueDate}</b>.</div>

        <div style="margin-top:14px;color:#374151;font-size:14px;line-height:1.6;">Por favor realiza el pago antes de la fecha para evitar inconvenientes con tu proceso de acompañamiento.</div>

        <div style="margin-top:12px;color:#374151;font-size:14px;line-height:1.6;">Recuerda validar tu cuota en tu panel de Seguimiento de Pagos para verificar la cuota, por favor.</div>

        ${computedPortalLink ? `
        <div style="margin:18px 0;">
          <a href="${esc(computedPortalLink)}" target="_blank" rel="noreferrer" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">👉 Ver mi plan</a>
        </div>
        ` : ""}

        <div style="margin-top:16px;color:#111827;font-size:14px;line-height:1.6;">Si ya realizaste el pago, ignora este mensaje.<br/><br/>Un abrazo,<br/><b>Equipo de ${esc(appName)}</b></div>

        <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef0f6;color:#6b7280;font-size:12px;line-height:1.5;">Este correo fue enviado automáticamente. No respondas a este mensaje.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `${greeting},\n\nTe escribimos para recordarte que ${cuota} por un total de ${amount} vence el ${dueDate}.\n\nPor favor realiza el pago antes de la fecha para evitar inconvenientes con tu proceso de acompañamiento.\n\n${computedPortalLink ? `Ver tu plan: ${computedPortalLink}\n\n` : ""}Si ya realizaste el pago, ignora este mensaje.\n\nUn abrazo,\nEquipo de ${appName}\n\nEste correo fue enviado automáticamente. No respondas a este mensaje.`;

  return { subject, html, text };
}
