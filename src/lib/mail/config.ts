import "server-only";

/**
 * Resend mail configuration. Optional until RESEND_API_KEY is set.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getMailFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    "Yelena Booking <onboarding@resend.dev>"
  );
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "https://yelena-booking.vercel.app";
}
