/**
 * Seeds Auth users + Firestore profiles + custom claims.
 * Usage: node --env-file=.env.local scripts/seed.mjs
 */
import { readFileSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i === -1) continue;
      let value = line.slice(i + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[line.slice(0, i)]) {
        process.env[line.slice(0, i)] = value;
      }
    }
  } catch {
    // optional when env already injected
  }
}

loadEnvLocal();

const SEEDS = [
  {
    email: "admin@yelena.app",
    password: "YelenaAdmin123!",
    displayName: "Admin Yelena",
    role: "admin",
  },
  {
    email: "paciente@yelena.app",
    password: "YelenaPatient123!",
    displayName: "Paciente Demo",
    role: "paciente",
  },
  {
    email: "especialista@yelena.app",
    password: "YelenaSpecialist123!",
    displayName: "Dra. Ana Especialista",
    role: "especialista",
    specialist: {
      specialty: "Dermatología",
      licenseNumber: "COL-DEM-001",
      bio: "Especialista demo pendiente/activa de seed.",
      location: "Madrid",
      status: "active",
    },
  },
  {
    email: "especialista.pending@yelena.app",
    password: "YelenaSpecialist123!",
    displayName: "Dr. Pending",
    role: "especialista",
    specialist: {
      specialty: "Cardiología",
      licenseNumber: "COL-DEM-002",
      bio: "Especialista en cola de aprobación.",
      location: "Barcelona",
      status: "pending",
    },
  },
];

function initAdmin() {
  if (getApps().length) return;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error("Missing FIREBASE_ADMIN_* in .env.local");
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

async function upsertAuthUser(seed) {
  const auth = getAuth();
  try {
    const existing = await auth.getUserByEmail(seed.email);
    await auth.updateUser(existing.uid, {
      password: seed.password,
      displayName: seed.displayName,
      emailVerified: true,
    });
    return existing.uid;
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    const created = await auth.createUser({
      email: seed.email,
      password: seed.password,
      displayName: seed.displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function seed() {
  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  // Marker doc so the console shows collections immediately.
  await db.collection("_meta").doc("seed").set(
    {
      version: 1,
      seededAt: FieldValue.serverTimestamp(),
      collections: ["users", "specialists", "appointments", "ehrNotes", "medicalFiles"],
    },
    { merge: true },
  );

  for (const seedUser of SEEDS) {
    const uid = await upsertAuthUser(seedUser);
    await auth.setCustomUserClaims(uid, { role: seedUser.role });

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          email: seedUser.email,
          displayName: seedUser.displayName,
          photoUrl: null,
          role: seedUser.role,
          locale: "es",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    if (seedUser.specialist) {
      await db
        .collection("specialists")
        .doc(uid)
        .set(
          {
            userId: uid,
            specialty: seedUser.specialist.specialty,
            licenseNumber: seedUser.specialist.licenseNumber,
            bio: seedUser.specialist.bio,
            location: seedUser.specialist.location,
            rating: 4.8,
            status: seedUser.specialist.status,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    console.log(`✓ ${seedUser.role.padEnd(12)} ${seedUser.email} (${uid})`);
  }

  console.log("\nSeed complete. Demo passwords:");
  for (const seedUser of SEEDS) {
    console.log(`  ${seedUser.email} / ${seedUser.password}`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
