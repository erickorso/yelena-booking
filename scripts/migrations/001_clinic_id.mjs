/**
 * Migration 001 — stamp clinicId on appointments (+ optional users).
 * Usage: node --env-file=.env.local scripts/migrations/run.mjs 001
 */
import { FieldValue } from "firebase-admin/firestore";

export const id = "001_clinic_id";
export const description = "Backfill clinicId=yelena on appointments and users";

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
export async function up(db) {
  const clinicId = "yelena";
  let appointments = 0;
  let users = 0;

  const apptSnap = await db.collection("appointments").limit(500).get();
  for (const doc of apptSnap.docs) {
    const data = doc.data();
    if (typeof data.clinicId === "string" && data.clinicId.trim()) continue;
    await doc.ref.update({
      clinicId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    appointments += 1;
  }

  const userSnap = await db.collection("users").limit(500).get();
  for (const doc of userSnap.docs) {
    const data = doc.data();
    if (typeof data.clinicId === "string" && data.clinicId.trim()) continue;
    await doc.ref.update({
      clinicId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    users += 1;
  }

  return { appointments, users, clinicId };
}
