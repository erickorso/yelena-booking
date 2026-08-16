import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { AdminClinicalHistoryRepository } from "@/repositories/firestore/AdminClinicalHistoryRepository";
import { AdminNotificationRepository } from "@/repositories/firestore/AdminNotificationRepository";
import { isAppTimezone, DEFAULT_PATIENT_TIMEZONE } from "@/lib/timezones";

interface CreatePatientBody {
  email?: unknown;
  displayName?: unknown;
  phone?: unknown;
  password?: unknown;
  locale?: unknown;
  timezone?: unknown;
}

async function assertActiveSpecialist(uid: string, role: string) {
  if (role === "admin") return;
  const users = new AdminUserRepository();
  const specialist = await users.getSpecialistByUserId(uid);
  if (!specialist || specialist.status !== "active") {
    throw new Error("SPECIALIST_NOT_ACTIVE");
  }
}

/**
 * GET /api/specialists/patients — list bookable patients (active specialist / admin).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  try {
    await assertActiveSpecialist(auth.uid, auth.role);
    const users = new AdminUserRepository();
    const patients = await users.listBookablePatients();
    return NextResponse.json({
      patients: patients.map((p) => ({
        id: p.id,
        email: p.email,
        displayName: p.displayName,
        timezone: p.timezone,
        role: p.role,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SPECIALIST_NOT_ACTIVE") {
      return NextResponse.json(
        { error: "Specialist must be active" },
        { status: 403 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to list patients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/specialists/patients — register a patient account (active specialist / admin).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  let body: CreatePatientBody;
  try {
    body = (await request.json()) as CreatePatientBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const locale = body.locale === "en" || body.locale === "es" ? body.locale : "es";
  const timezone = isAppTimezone(body.timezone)
    ? body.timezone
    : DEFAULT_PATIENT_TIMEZONE;
  const password =
    typeof body.password === "string" && body.password.length >= 8
      ? body.password
      : `Te${randomBytes(4).toString("hex")}!aA`;

  if (!email || !displayName || !phone) {
    return NextResponse.json(
      { error: "email, displayName and phone are required" },
      { status: 400 },
    );
  }

  try {
    await assertActiveSpecialist(auth.uid, auth.role);
    const users = new AdminUserRepository();
    const existing = await users.findByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists", id: existing.id },
        { status: 409 },
      );
    }

    const adminAuth = await getAdminAuth();
    const created = await adminAuth.createUser({
      email,
      password,
      displayName,
      // Clinic vouchsafes the contact; self-signup still requires email verification.
      emailVerified: true,
    });
    await adminAuth.setCustomUserClaims(created.uid, { role: "paciente" });

    const profile = await users.create({
      id: created.uid,
      email,
      displayName,
      role: "paciente",
      locale,
      timezone,
    });

    await new AdminClinicalHistoryRepository().upsert(
      created.uid,
      { phone },
      auth.uid,
    );

    const historyHref = "/dashboard/patient?tab=history";
    await new AdminNotificationRepository().create({
      userId: created.uid,
      kind: "generic",
      title:
        locale === "en"
          ? "Complete your clinical history"
          : "Completa tu historia clínica",
      body:
        locale === "en"
          ? "Your specialist created your account. Please fill in your clinical history (birth date, allergies, medications…)."
          : "Tu especialista creó tu cuenta. Completa tu historia clínica (fecha de nacimiento, alergias, medicación…).",
      href: historyHref,
      meta: { reason: "clinical_history_incomplete" },
    });

    return NextResponse.json({
      ok: true,
      patient: {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        timezone: profile.timezone,
        phone,
      },
      temporaryPassword: password,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SPECIALIST_NOT_ACTIVE") {
      return NextResponse.json(
        { error: "Specialist must be active" },
        { status: 403 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create patient";
    const code = message.includes("email-already-exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status: code });
  }
}
