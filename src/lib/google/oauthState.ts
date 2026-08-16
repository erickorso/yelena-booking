import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

type StatePayload = {
  uid: string;
  exp: number;
  nonce: string;
};

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

export function signOAuthState(uid: string, secret: string): string {
  const payload: StatePayload = {
    uid,
    exp: Date.now() + STATE_TTL_MS,
    nonce: b64url(randomBytes(16)),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyOAuthState(
  state: string,
  secret: string,
): { ok: true; uid: string } | { ok: false; error: string } {
  const [body, sig] = state.split(".");
  if (!body || !sig) return { ok: false, error: "Malformed state" };

  const expected = b64url(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Invalid state signature" };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as StatePayload;
  } catch {
    return { ok: false, error: "Invalid state payload" };
  }

  if (!payload.uid || typeof payload.uid !== "string") {
    return { ok: false, error: "Missing uid in state" };
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { ok: false, error: "State expired" };
  }
  return { ok: true, uid: payload.uid };
}
