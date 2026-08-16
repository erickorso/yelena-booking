import { z } from "zod";

const isoDateTime = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid ISO date" });

export const bookAppointmentBodySchema = z.object({
  patientId: z.string().trim().min(1),
  specialistId: z.string().trim().min(1),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  notes: z.string().max(2000).nullable().optional(),
});

export type BookAppointmentBody = z.infer<typeof bookAppointmentBodySchema>;
