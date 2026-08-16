import "server-only";

import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

export type DirectorySpecialist = {
  id: string;
  displayName: string;
  specialty: string;
  location: string;
  bio: string;
  rating: number | null;
};

/**
 * Public directory rows (active specialists only).
 * Shared by GET /api/specialists and the SSR specialists page.
 */
export async function listDirectorySpecialists(): Promise<DirectorySpecialist[]> {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }

  const users = new AdminUserRepository();
  const active = await users.listActiveSpecialists();

  return Promise.all(
    active.map(async (s) => {
      const user = await users.getById(s.userId);
      return {
        id: s.id,
        specialty: s.specialty,
        location: s.location,
        bio: s.bio,
        rating: s.rating,
        displayName: user?.displayName?.trim() || "Especialista",
      };
    }),
  );
}
