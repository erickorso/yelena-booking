import { readFileSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
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
  process.env[line.slice(0, i)] = value;
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const users = await getAuth().listUsers(1);
const probe = getFirestore().collection("_health").doc("ping");
await probe.set({ ok: true, at: new Date().toISOString() }, { merge: true });
const snap = await probe.get();

console.log(
  JSON.stringify({
    adminAuth: "OK",
    listedUsers: users.users.length,
    firestoreWriteRead: snap.exists && snap.data()?.ok === true,
  }),
);
