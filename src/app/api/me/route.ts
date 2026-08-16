import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

/**
 * GET /api/me — current user profile summary.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const profile = await new AdminUserRepository().getById(auth.uid);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
      role: profile.role,
      locale: profile.locale,
      timezone: profile.timezone,
      patientNumber: profile.patientNumber,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/me — update displayName (and sync Firebase Auth).
 * Body: { displayName: string }
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: { displayName?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName || displayName.length > 120) {
    return NextResponse.json(
      { error: "displayName is required (max 120 chars)" },
      { status: 400 },
    );
  }

  try {
    const users = new AdminUserRepository();
    const profile = await users.updateDisplayName(auth.uid, displayName);
    try {
      await (await getAdminAuth()).updateUser(auth.uid, {
        displayName: profile.displayName,
      });
    } catch (err) {
      console.error("[me] Auth displayName sync failed", err);
    }
    return NextResponse.json({
      ok: true,
      displayName: profile.displayName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
