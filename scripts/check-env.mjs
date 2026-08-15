import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const keys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "BLOB_READ_WRITE_TOKEN",
];

for (const key of keys) {
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  const value = match?.[1]?.trim() ?? "";
  console.log(`${key}: ${value.length > 0 ? "SET" : "MISSING"}`);
}
