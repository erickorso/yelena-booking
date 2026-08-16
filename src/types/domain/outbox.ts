export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "done",
  "dead",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OUTBOX_JOB_TYPES = [
  "appointment.google_sync",
  "appointment.mail_booked",
] as const;

export type OutboxJobType = (typeof OUTBOX_JOB_TYPES)[number];

export type OutboxJob = {
  id: string;
  clinicId: string;
  type: OutboxJobType;
  appointmentId: string;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_OUTBOX_MAX_ATTEMPTS = 5;

/** Exponential backoff in ms: 30s, 2m, 8m, 32m, … capped at 6h. */
export function outboxBackoffMs(attemptsAfterFailure: number): number {
  const base = 30_000 * 4 ** Math.max(0, attemptsAfterFailure - 1);
  return Math.min(base, 6 * 60 * 60 * 1000);
}
