import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AppointmentService } from "@/services/appointmentService";
import {
  bookAppointment,
  BookAppointmentError,
} from "@/application/bookAppointment";
import { bookAppointmentBodySchema } from "@/contracts/appointments";
import { serializeAppointment } from "@/lib/api/serializeAppointment";
import {
  beginApiRequest,
  jsonError,
  jsonOk,
  readJsonBody,
  zodErrorResponse,
} from "@/lib/http/apiResponse";
import {
  AdminIdempotencyRepository,
  hashIdempotencyRequest,
} from "@/repositories/firestore/AdminIdempotencyRepository";

/**
 * GET /api/appointments?as=patient|specialist
 */
export async function GET(request: Request) {
  const ctx = beginApiRequest(request);
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const as = url.searchParams.get("as");
  const repo = new AdminAppointmentRepository();
  const service = new AppointmentService(repo);

  try {
    if (as === "specialist" && (auth.role === "especialista" || auth.role === "admin")) {
      const patientId = url.searchParams.get("patientId")?.trim();
      if (patientId) {
        const list = await service.list({ patientId });
        return jsonOk(ctx, {
          appointments: list
            .filter((a) => a.clinicId === auth.clinicId)
            .map(serializeAppointment),
        });
      }
      const list = await service.list({ specialistId: auth.uid });
      return jsonOk(ctx, {
        appointments: list
          .filter((a) => a.clinicId === auth.clinicId)
          .map(serializeAppointment),
      });
    }

    if (auth.role !== "paciente" && auth.role !== "especialista" && auth.role !== "admin") {
      return jsonError(ctx, 403, "Forbidden");
    }

    const list = await service.list({ patientId: auth.uid });
    return jsonOk(ctx, {
      appointments: list
        .filter((a) => a.clinicId === auth.clinicId)
        .map(serializeAppointment),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list appointments";
    return jsonError(ctx, 500, message);
  }
}

/**
 * POST /api/appointments — idempotent booking (Idempotency-Key) + outbox side-effects.
 */
export async function POST(request: Request) {
  const ctx = beginApiRequest(request);
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const raw = await readJsonBody(request);
  if (raw === null) return jsonError(ctx, 400, "Invalid JSON body");

  const parsed = bookAppointmentBodySchema.safeParse(raw);
  if (!parsed.success) return zodErrorResponse(ctx, parsed.error);

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return jsonError(ctx, 400, "Invalid dates");
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;
  const idem = new AdminIdempotencyRepository();
  const requestHash = hashIdempotencyRequest(parsed.data);

  if (idempotencyKey) {
    if (idempotencyKey.length > 128) {
      return jsonError(ctx, 400, "Idempotency-Key too long");
    }
    const existing = await idem.get(auth.uid, idempotencyKey);
    if (existing?.status === "completed" && existing.response) {
      if (existing.requestHash !== requestHash) {
        return jsonError(ctx, 409, "Idempotency-Key reuse with different body");
      }
      return jsonOk(ctx, existing.response as Record<string, unknown>);
    }
    if (existing?.status === "pending") {
      return jsonError(ctx, 409, "Booking already in progress for this key", {
        code: "idempotency_in_progress",
      });
    }
    const began = await idem.begin({
      uid: auth.uid,
      key: idempotencyKey,
      clinicId: auth.clinicId,
      requestHash,
    });
    if (began === "exists") {
      const again = await idem.get(auth.uid, idempotencyKey);
      if (again?.status === "completed" && again.response) {
        return jsonOk(ctx, again.response as Record<string, unknown>);
      }
      return jsonError(ctx, 409, "Booking already in progress for this key", {
        code: "idempotency_in_progress",
      });
    }
  }

  try {
    const result = await bookAppointment({
      actor: {
        uid: auth.uid,
        role: auth.role,
        clinicId: auth.clinicId,
      },
      patientId: parsed.data.patientId,
      specialistId: parsed.data.specialistId,
      startsAt,
      endsAt,
      notes: parsed.data.notes ?? null,
      requestId: ctx.requestId,
    });
    const body = {
      ok: true as const,
      googleSynced: result.googleSynced,
      mailSent: result.mailSent,
      mailSkipped: result.mailSkipped,
      outboxEnqueued: result.outboxEnqueued,
      appointment: serializeAppointment(result.appointment),
    };
    if (idempotencyKey) {
      await idem.complete(auth.uid, idempotencyKey, result.appointment.id, body);
    }
    return jsonOk(ctx, body);
  } catch (error) {
    if (error instanceof BookAppointmentError) {
      return jsonError(ctx, error.status, error.message, {
        code: error.code,
      });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create appointment";
    return jsonError(ctx, 400, message);
  }
}
