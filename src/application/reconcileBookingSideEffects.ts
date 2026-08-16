import "server-only";

import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminOutboxRepository } from "@/repositories/firestore/AdminOutboxRepository";
import { enqueueBookingSideEffects } from "@/application/processOutbox";
import { logServer } from "@/lib/observability/logger";

/**
 * Re-queue Google sync / mail for recent confirmed appointments missing side-effects.
 */
export async function reconcileBookingSideEffects(limit = 40): Promise<{
  scanned: number;
  enqueued: number;
}> {
  const repo = new AdminAppointmentRepository();
  const outbox = new AdminOutboxRepository();
  // Specialist-agnostic scan capped (Admin list without filter uses limit 100).
  const list = await repo.list({});
  const recent = list
    .filter((a) => a.status === "confirmed" || a.status === "pending")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  let enqueued = 0;
  for (const appt of recent) {
    const needsGcal = !appt.googleEventId;
    const gcalOpen = needsGcal
      ? await outbox.hasOpenJob(appt.id, "appointment.google_sync")
      : true;
    const mailOpen = await outbox.hasOpenJob(appt.id, "appointment.mail_booked");
    const mailDone = (await outbox.getById(`mail_${appt.id}`))?.status === "done";

    if ((needsGcal && !gcalOpen) || (!mailDone && !mailOpen)) {
      await enqueueBookingSideEffects({
        clinicId: appt.clinicId,
        appointmentId: appt.id,
      });
      enqueued += 1;
      logServer("info", "reconcile_enqueued", {
        appointmentId: appt.id,
        needsGcal,
        mailDone,
      });
    }
  }

  return { scanned: recent.length, enqueued };
}
