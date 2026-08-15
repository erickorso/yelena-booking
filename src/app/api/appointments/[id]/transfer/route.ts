import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminNotificationRepository } from "@/repositories/firestore/AdminNotificationRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

/**
 * POST /api/appointments/[id]/transfer
 * Body: { toSpecialistId: string }
 * Creates a pending transfer; target must confirm via notification.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  let body: { toSpecialistId?: unknown };
  try {
    body = (await request.json()) as { toSpecialistId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toSpecialistId =
    typeof body.toSpecialistId === "string" ? body.toSpecialistId.trim() : "";
  if (!toSpecialistId) {
    return NextResponse.json(
      { error: "toSpecialistId is required" },
      { status: 400 },
    );
  }
  if (toSpecialistId === auth.uid) {
    return NextResponse.json(
      { error: "Cannot transfer to yourself" },
      { status: 400 },
    );
  }

  try {
    const appointments = new AdminAppointmentRepository();
    const users = new AdminUserRepository();
    const notifications = new AdminNotificationRepository();

    const appt = await appointments.getById(id);
    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (auth.role === "especialista" && appt.specialistId !== auth.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (appt.transfer.status === "pending") {
      return NextResponse.json(
        { error: "Transfer already pending" },
        { status: 409 },
      );
    }

    const target = await users.getSpecialistByUserId(toSpecialistId);
    if (!target || target.status !== "active") {
      return NextResponse.json(
        { error: "Target specialist not active" },
        { status: 400 },
      );
    }

    const existing = await appointments.list({ specialistId: toSpecialistId });
    const conflict = existing.some(
      (a) =>
        a.status !== "cancelled" &&
        appt.startsAt < a.endsAt &&
        a.startsAt < appt.endsAt,
    );
    if (conflict) {
      return NextResponse.json(
        { error: "Target specialist has a conflict at that time" },
        { status: 409 },
      );
    }

    await appointments.updateFields(id, {
      transfer: {
        status: "pending",
        toSpecialistId,
        fromSpecialistId: appt.specialistId,
        requestedBy: auth.uid,
        requestedAt: FieldValue.serverTimestamp(),
        respondedAt: null,
      },
    });

    const fromProfile = await users.getById(auth.uid);
    await notifications.create({
      userId: toSpecialistId,
      kind: "transfer_request",
      title: "Solicitud de transferencia",
      body: `${fromProfile?.displayName ?? "Un especialista"} te ofrece una cita el ${appt.startsAt.toLocaleString()}. Confirma o rechaza.`,
      href: "/dashboard/specialist",
      meta: {
        appointmentId: id,
        fromSpecialistId: appt.specialistId,
      },
    });

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transfer request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
