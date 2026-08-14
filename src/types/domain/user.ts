import type { AuthRole } from "./roles";

export type SpecialistStatus = "pending" | "active" | "rejected";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: AuthRole;
  locale: "en" | "es";
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecialistProfile {
  id: string;
  userId: string;
  specialty: string;
  bio: string;
  location: string;
  rating: number | null;
  status: SpecialistStatus;
  licenseNumber: string;
  createdAt: Date;
  updatedAt: Date;
}
