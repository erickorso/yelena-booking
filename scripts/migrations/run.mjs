/**
 * Versioned Firestore migrations. Tracks `_meta/schemaVersion`.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrations/run.mjs
 *   node --env-file=.env.local scripts/migrations/run.mjs 001
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(__dirname, "../../.env.local"), "utf8");
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
      const key = line.slice(0, i);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

function initAdmin() {
  if (getApps().length) return;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error("Missing FIREBASE_ADMIN_*");
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const only = process.argv[2]?.trim();

  const files = readdirSync(__dirname)
    .filter((f) => /^\d{3}_.+\.mjs$/.test(f))
    .sort();

  const metaRef = db.collection("_meta").doc("schemaVersion");
  const metaSnap = await metaRef.get();
  const applied = new Set(
    Array.isArray(metaSnap.data()?.applied) ? metaSnap.data().applied : [],
  );

  for (const file of files) {
    if (only && !file.startsWith(only)) continue;
    const mod = await import(pathToFileURL(join(__dirname, file)).href);
    const migId = mod.id || file;
    if (applied.has(migId)) {
      console.log(`skip ${migId}`);
      continue;
    }
    console.log(`run  ${migId} — ${mod.description || ""}`);
    const result = await mod.up(db);
    applied.add(migId);
    await metaRef.set(
      {
        version: migId,
        applied: [...applied],
        updatedAt: FieldValue.serverTimestamp(),
        lastResult: result ?? null,
      },
      { merge: true },
    );
    console.log(`ok   ${migId}`, result ?? "");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
