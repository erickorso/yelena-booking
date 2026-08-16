export type AppointmentMailPayload = {
  patientName: string;
  specialistName: string;
  startsAt: Date;
  endsAt: Date;
  locale?: "es" | "en";
  dashboardUrl: string;
  meetLink?: string | null;
};

export type TransferMailPayload = {
  toName: string;
  fromName: string;
  patientName: string;
  startsAt: Date;
  dashboardUrl: string;
  locale?: "es" | "en";
};

function formatWhen(date: Date, locale: "es" | "en"): string {
  return date.toLocaleString(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

/**
 * Plain HTML templates (no React Email dependency).
 */
export function buildSmokeEmail(toLabel: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Yelena — prueba de correo";
  const text = `Hola ${toLabel}. Este es un correo de prueba del módulo de mails de Yelena Booking.`;
  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf8f5;padding:24px;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:24px">
    <h1 style="font-size:22px;color:#0f766e;margin:0 0 12px">Yelena Booking</h1>
    <p style="margin:0 0 12px">Hola <strong>${escapeHtml(toLabel)}</strong>.</p>
    <p style="margin:0 0 12px">Este es un correo de prueba del módulo de mails. Si lo recibes, Resend está bien configurado.</p>
    <p style="margin:0;font-size:12px;color:#78716c">No respondas a este mensaje automático.</p>
  </div></body></html>`;
  return { subject, html, text };
}

export function buildAppointmentBookedEmail(payload: AppointmentMailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = payload.locale ?? "es";
  const when = formatWhen(payload.startsAt, locale);
  const subject =
    locale === "es"
      ? `Cita confirmada · ${when}`
      : `Appointment confirmed · ${when}`;
  const text =
    locale === "es"
      ? `Hola ${payload.patientName}. Tu cita con ${payload.specialistName} está confirmada para ${when}.${payload.meetLink ? ` Meet: ${payload.meetLink}` : ""} Panel: ${payload.dashboardUrl}`
      : `Hi ${payload.patientName}. Your appointment with ${payload.specialistName} is confirmed for ${when}.${payload.meetLink ? ` Meet: ${payload.meetLink}` : ""} Dashboard: ${payload.dashboardUrl}`;
  const meetHtml = payload.meetLink
    ? `<p style="margin:0 0 16px"><strong>Google Meet:</strong> <a href="${escapeAttr(payload.meetLink)}" style="color:#0f766e">${escapeHtml(payload.meetLink)}</a></p>`
    : "";
  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf8f5;padding:24px;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:24px">
    <h1 style="font-size:22px;color:#0f766e;margin:0 0 12px">${locale === "es" ? "Cita confirmada" : "Appointment confirmed"}</h1>
    <p style="margin:0 0 12px">${locale === "es" ? "Hola" : "Hi"} <strong>${escapeHtml(payload.patientName)}</strong>.</p>
    <p style="margin:0 0 8px"><strong>${locale === "es" ? "Especialista" : "Specialist"}:</strong> ${escapeHtml(payload.specialistName)}</p>
    <p style="margin:0 0 16px"><strong>${locale === "es" ? "Cuándo" : "When"}:</strong> ${escapeHtml(when)}</p>
    ${meetHtml}
    <p style="margin:0 0 16px"><a href="${escapeAttr(payload.dashboardUrl)}" style="color:#0f766e">${locale === "es" ? "Abrir panel" : "Open dashboard"}</a></p>
    <p style="margin:0;font-size:12px;color:#78716c">Yelena Booking</p>
  </div></body></html>`;
  return { subject, html, text };
}

export function buildTransferRequestEmail(payload: TransferMailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = payload.locale ?? "es";
  const when = formatWhen(payload.startsAt, locale);
  const subject =
    locale === "es"
      ? "Solicitud de transferencia de cita"
      : "Appointment transfer request";
  const text =
    locale === "es"
      ? `${payload.fromName} te ofrece una cita de ${payload.patientName} el ${when}. Confirma en ${payload.dashboardUrl}`
      : `${payload.fromName} offers you an appointment for ${payload.patientName} on ${when}. Confirm at ${payload.dashboardUrl}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf8f5;padding:24px;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:24px">
    <h1 style="font-size:22px;color:#0f766e;margin:0 0 12px">${subject}</h1>
    <p style="margin:0 0 12px">${locale === "es" ? "Hola" : "Hi"} <strong>${escapeHtml(payload.toName)}</strong>.</p>
    <p style="margin:0 0 8px"><strong>${escapeHtml(payload.fromName)}</strong> ${locale === "es" ? "te ofrece una cita" : "offers you an appointment"}.</p>
    <p style="margin:0 0 8px"><strong>${locale === "es" ? "Paciente" : "Patient"}:</strong> ${escapeHtml(payload.patientName)}</p>
    <p style="margin:0 0 16px"><strong>${locale === "es" ? "Cuándo" : "When"}:</strong> ${escapeHtml(when)}</p>
    <p style="margin:0 0 16px"><a href="${escapeAttr(payload.dashboardUrl)}" style="color:#0f766e">${locale === "es" ? "Confirmar en el panel" : "Confirm in dashboard"}</a></p>
    <p style="margin:0;font-size:12px;color:#78716c">Yelena Booking</p>
  </div></body></html>`;
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
