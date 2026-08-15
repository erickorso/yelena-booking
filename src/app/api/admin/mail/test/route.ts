import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { isMailConfigured } from "@/lib/mail/config";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { MailService } from "@/services/mailService";

export const runtime = "nodejs";

type TestBody = {
  template?: unknown;
  to?: unknown;
  appointmentId?: unknown;
};

/**
 * POST /api/admin/mail/test
 * Body: { template: "smoke"|"appointment"|"transfer", to?: string, appointmentId?: string }
 * Admin-only. Sends a real Resend email for module testing.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  if (!isMailConfigured()) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY no configurada. Añádela en .env.local / Vercel y MAIL_FROM.",
      },
      { status: 503 },
    );
  }

  let body: TestBody;
  try {
    body = (await request.json()) as TestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const template =
    body.template === "appointment" ||
    body.template === "transfer" ||
    body.template === "smoke"
      ? body.template
      : "smoke";
  const toOverride =
    typeof body.to === "string" && body.to.includes("@")
      ? body.to.trim()
      : null;
  const appointmentId =
    typeof body.appointmentId === "string" && body.appointmentId.trim()
      ? body.appointmentId.trim()
      : null;

  const users = new AdminUserRepository();
  const mail = new MailService();
  const admin = await users.getById(auth.uid);
  const defaultTo = toOverride ?? admin?.email;
  if (!defaultTo) {
    return NextResponse.json(
      { error: "No recipient email (pass `to` or ensure admin profile has email)" },
      { status: 400 },
    );
  }

  try {
    if (template === "smoke") {
      const result = await mail.sendSmoke(
        defaultTo,
        admin?.displayName ?? defaultTo,
      );
      return NextResponse.json({ ok: result.ok, template, to: defaultTo, result });
    }

    const appointments = new AdminAppointmentRepository();
    let appt = appointmentId
      ? await appointments.getById(appointmentId)
      : null;
    if (!appt) {
      const list = await appointments.list({});
      appt =
        [...list]
          .filter((a) => a.status !== "cancelled")
          .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0] ??
        null;
    }
    if (!appt) {
      return NextResponse.json(
        { error: "No appointment found to render template" },
        { status: 404 },
      );
    }

    const patient = await users.getById(appt.patientId);
    const specialist = await users.getById(appt.specialistId);

    if (template === "appointment") {
      const to = toOverride ?? patient?.email ?? defaultTo;
      const result = await mail.sendAppointmentBooked({
        to,
        patientName: patient?.displayName ?? "Paciente",
        specialistName: specialist?.displayName ?? "Especialista",
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
      });
      return NextResponse.json({
        ok: result.ok,
        template,
        to,
        appointmentId: appt.id,
        result,
      });
    }

    // transfer
    const to = toOverride ?? specialist?.email ?? defaultTo;
    const result = await mail.sendTransferRequest({
      to,
      toName: specialist?.displayName ?? "Especialista",
      fromName: admin?.displayName ?? "Admin",
      patientName: patient?.displayName ?? "Paciente",
      startsAt: appt.startsAt,
    });
    return NextResponse.json({
      ok: result.ok,
      template,
      to,
      appointmentId: appt.id,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mail test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/admin/mail/test — status of mail config (no secrets).
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  return NextResponse.json({
    configured: isMailConfigured(),
    fromHint: process.env.MAIL_FROM?.trim()
      ? "custom"
      : "onboarding@resend.dev (default)",
  });
}
