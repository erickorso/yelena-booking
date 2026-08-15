import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { AppointmentService } from "@/services/appointmentService";
import { canActAsPatient } from "@/types/domain";

interface CreateBody {
  patientId?: unknown;
  specialistId?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  notes?: unknown;
}

function serialize(appointment: {
  id: string;
  patientId: string;
  specialistId: string;
  bookedById: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  notes: string | null;
}) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    specialistId: appointment.specialistId,
    bookedById: appointment.bookedById,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    notes: appointment.notes,
  };
}

/**
 * GET /api/appointments?as=patient|specialist
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const as = url.searchParams.get("as");
  const repo = new AdminAppointmentRepository();
  const service = new AppointmentService(repo);

  try {
    if (as === "specialist" && (auth.role === "especialista" || auth.role === "admin")) {
      const list = await service.list({ specialistId: auth.uid });
      return NextResponse.json({ appointments: list.map(serialize) });
    }

    if (!canActAsPatient(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const list = await service.list({ patientId: auth.uid });
    return NextResponse.json({ appointments: list.map(serialize) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list appointments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/appointments
 * - Self-book: patientId === caller (paciente | especialista | admin)
 * - On behalf: active especialista/admin; specialistId must be caller's uid (unless admin)
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patientId =
    typeof body.patientId === "string" ? body.patientId.trim() : "";
  const specialistId =
    typeof body.specialistId === "string" ? body.specialistId.trim() : "";
  const startsAt =
    typeof body.startsAt === "string" ? new Date(body.startsAt) : null;
  const endsAt = typeof body.endsAt === "string" ? new Date(body.endsAt) : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!patientId || !specialistId || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "patientId, specialistId, startsAt, endsAt are required" },
      { status: 400 },
    );
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  try {
    const users = new AdminUserRepository();
    const isSelf = patientId === auth.uid;

    if (isSelf) {
      if (!canActAsPatient(auth.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (auth.role !== "especialista" && auth.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (auth.role === "especialista") {
        const me = await users.getSpecialistByUserId(auth.uid);
        if (!me || me.status !== "active") {
          return NextResponse.json(
            { error: "Specialist must be active" },
            { status: 403 },
          );
        }
        if (specialistId !== auth.uid) {
          return NextResponse.json(
            { error: "Can only book patients with yourself as specialist" },
            { status: 403 },
          );
        }
      }
    }

    const specialist = await users.getSpecialistByUserId(specialistId);
    if (!specialist || specialist.status !== "active") {
      return NextResponse.json(
        { error: "Target specialist is not active" },
        { status: 400 },
      );
    }

    const patient = await users.getById(patientId);
    if (!patient || !canActAsPatient(patient.role)) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const repo = new AdminAppointmentRepository();
    const existing = await repo.list({ specialistId });
    const conflict = existing.some((a) => {
      if (a.status === "cancelled") return false;
      return startsAt < a.endsAt && a.startsAt < endsAt;
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Slot already booked" },
        { status: 409 },
      );
    }

    const service = new AppointmentService(repo);
    const appointment = await service.book({
      patientId,
      specialistId,
      startsAt,
      endsAt,
      notes,
      bookedById: auth.uid,
    });

    return NextResponse.json({ ok: true, appointment: serialize(appointment) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create appointment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
