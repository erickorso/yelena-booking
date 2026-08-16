import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminSpecialtyRepository } from "@/repositories/firestore/AdminSpecialtyRepository";

/**
 * GET /api/specialties — public catalog (defaults + custom).
 */
export async function GET() {
  try {
    const names = await new AdminSpecialtyRepository().listNames();
    return NextResponse.json({
      specialties: names.map((name) => ({ id: name, name })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list specialties";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/specialties — add custom specialty if missing (auth).
 * Body: { name: string }
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: { name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.name === "string" ? body.name.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (raw.length > 80) {
    return NextResponse.json({ error: "name too long" }, { status: 400 });
  }

  try {
    const name = await new AdminSpecialtyRepository().ensure(raw, auth.uid);
    return NextResponse.json({ ok: true, specialty: { id: name, name } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create specialty";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
