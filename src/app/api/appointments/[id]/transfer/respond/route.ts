import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminNotificationRepository } from "@/repositories/firestore/AdminNotificationRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

/**
 * POST /api/appointments/[id]/transfer/respond
 * Body: { accept: boolean }
 * Only the target specialist can confirm/reject.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  let body: { accept?: unknown };
  try {
    body = (await request.json()) as { accept?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "accept boolean required" }, { status: 400 });
  }

  try {
    const appointments = new AdminAppointmentRepository();
    const users = new AdminUserRepository();
    const notifications = new AdminNotificationRepository();

    const appt = await appointments.getById(id);
    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (appt.transfer.status !== "pending" || !appt.transfer.toSpecialistId) {
      return NextResponse.json(
        { error: "No pending transfer" },
        { status: 409 },
      );
    }
    if (
      auth.role === "especialista" &&
      appt.transfer.toSpecialistId !== auth.uid
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fromId = appt.transfer.fromSpecialistId ?? appt.specialistId;
    const responder = await users.getById(auth.uid);

    if (body.accept) {
      await appointments.updateFields(id, {
        specialistId: appt.transfer.toSpecialistId,
        transfer: {
          status: "accepted",
          toSpecialistId: appt.transfer.toSpecialistId,
          fromSpecialistId: fromId,
          requestedBy: appt.transfer.requestedBy,
          requestedAt: appt.transfer.requestedAt,
          respondedAt: FieldValue.serverTimestamp(),
        },
      });
      await notifications.create({
        userId: fromId,
        kind: "transfer_accepted",
        title: "Transferencia aceptada",
        body: `${responder?.displayName ?? "Especialista"} aceptó la cita del ${appt.startsAt.toLocaleString()}.`,
        href: "/dashboard/specialist",
        meta: { appointmentId: id },
      });
      return NextResponse.json({ ok: true, status: "accepted" });
    }

    await appointments.updateFields(id, {
      transfer: {
        status: "rejected",
        toSpecialistId: appt.transfer.toSpecialistId,
        fromSpecialistId: fromId,
        requestedBy: appt.transfer.requestedBy,
        requestedAt: appt.transfer.requestedAt,
        respondedAt: FieldValue.serverTimestamp(),
      },
    });
    await notifications.create({
      userId: fromId,
      kind: "transfer_rejected",
      title: "Transferencia rechazada",
      body: `${responder?.displayName ?? "Especialista"} rechazó la transferencia.`,
      href: "/dashboard/specialist",
      meta: { appointmentId: id },
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Respond failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
