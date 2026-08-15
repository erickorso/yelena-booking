import { readFileSync } from "fs";
import { execFileSync } from "child_process";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i), v];
    }),
);

const keys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

for (const key of keys) {
  const value = env[key];
  if (!value) {
    console.error(`Missing local ${key}`);
    process.exit(1);
  }

  execFileSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      key,
      "production,preview",
      "--force",
      "--no-sensitive",
      "--yes",
      "--value",
      value,
    ],
    { stdio: "inherit", shell: true },
  );
  console.log(`✓ ${key}`);
}
