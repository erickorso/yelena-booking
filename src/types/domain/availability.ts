/** 0 = Sunday … 6 = Saturday (JS Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeRange {
  /** HH:mm in specialist local timezone */
  start: string;
  end: string;
}

export interface AvailabilityRule {
  id: string;
  specialistId: string;
  weekday: Weekday;
  slots: TimeRange[];
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AvailabilityOverrideType = "block" | "custom_slots";

export interface AvailabilityOverride {
  id: string;
  specialistId: string;
  date: string; // YYYY-MM-DD
  type: AvailabilityOverrideType;
  slots: TimeRange[];
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
