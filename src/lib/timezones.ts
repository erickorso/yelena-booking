/** Common IANA zones for patient + specialist. */
export const APP_TIMEZONES = [
  {
    value: "America/Caracas",
    labelEs: "Venezuela (Caracas)",
    labelEn: "Venezuela (Caracas)",
  },
  {
    value: "America/Bogota",
    labelEs: "Colombia (Bogotá)",
    labelEn: "Colombia (Bogotá)",
  },
  {
    value: "America/Mexico_City",
    labelEs: "México (CDMX)",
    labelEn: "Mexico (Mexico City)",
  },
  {
    value: "America/Argentina/Buenos_Aires",
    labelEs: "Argentina (Buenos Aires)",
    labelEn: "Argentina (Buenos Aires)",
  },
  {
    value: "America/New_York",
    labelEs: "EE.UU. (Nueva York)",
    labelEn: "USA (New York)",
  },
  {
    value: "Europe/Madrid",
    labelEs: "España (Madrid)",
    labelEn: "Spain (Madrid)",
  },
  {
    value: "Europe/London",
    labelEs: "Reino Unido (Londres)",
    labelEn: "UK (London)",
  },
] as const;

export type AppTimezone = (typeof APP_TIMEZONES)[number]["value"];

export const DEFAULT_PATIENT_TIMEZONE: AppTimezone = "America/Caracas";

export function isAppTimezone(value: unknown): value is string {
  return (
    typeof value === "string" &&
    APP_TIMEZONES.some((z) => z.value === value)
  );
}

export function resolvePatientTimezone(value: string | null | undefined): string {
  if (value && value.trim()) return value.trim();
  return DEFAULT_PATIENT_TIMEZONE;
}
