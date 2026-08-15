export const NOTIFICATION_KINDS = [
  "transfer_request",
  "transfer_accepted",
  "transfer_rejected",
  "generic",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  /** Opaque payload (appointmentId, fromSpecialistId, …). */
  meta: Record<string, string>;
  createdAt: Date;
}
