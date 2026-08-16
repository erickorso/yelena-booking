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
        return jsonOk(ctx, { appointments: list.map(serializeAppointment) });
      }
      const list = await service.list({ specialistId: auth.uid });
      return jsonOk(ctx, { appointments: list.map(serializeAppointment) });
    }

    if (auth.role !== "paciente" && auth.role !== "especialista" && auth.role !== "admin") {
      return jsonError(ctx, 403, "Forbidden");
    }

    const list = await service.list({ patientId: auth.uid });
    return jsonOk(ctx, { appointments: list.map(serializeAppointment) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list appointments";
    return jsonError(ctx, 500, message);
  }
}

/**
 * POST /api/appointments — thin BFF over bookAppointment use-case.
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

  try {
    const result = await bookAppointment({
      actor: { uid: auth.uid, role: auth.role },
      patientId: parsed.data.patientId,
      specialistId: parsed.data.specialistId,
      startsAt,
      endsAt,
      notes: parsed.data.notes ?? null,
      requestId: ctx.requestId,
    });
    return jsonOk(ctx, {
      ok: true,
      googleSynced: result.googleSynced,
      mailSent: result.mailSent,
      mailSkipped: result.mailSkipped,
      appointment: serializeAppointment(result.appointment),
    });
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
