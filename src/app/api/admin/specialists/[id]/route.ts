import { NextResponse } from "next/server";
import { isErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import type { SpecialistStatus } from "@/types/domain";

interface StatusBody {
  status?: unknown;
}

const ALLOWED: readonly SpecialistStatus[] = ["active", "rejected", "pending"];

/**
 * PATCH /api/admin/specialists/[id]
 * Body: { status: 'active' | 'rejected' | 'pending' }
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing specialist id" }, { status: 400 });
  }

  let body: StatusBody;
  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.status !== "string" ||
    !ALLOWED.includes(body.status as SpecialistStatus)
  ) {
    return NextResponse.json(
      { error: "status must be active | rejected | pending" },
      { status: 400 },
    );
  }

  const status = body.status as SpecialistStatus;

  try {
    const users = new AdminUserRepository();
    const updated = await users.setSpecialistStatus(id, status);

    if (status === "rejected" || status === "active") {
      const { getAdminAuth } = await import("@/lib/firebase/admin");
      const adminAuth = await getAdminAuth();
      if (status === "rejected") {
        await adminAuth.setCustomUserClaims(updated.userId, { role: "paciente" });
        await users.updateRole(updated.userId, "paciente");
      } else {
        await adminAuth.setCustomUserClaims(updated.userId, {
          role: "especialista",
        });
        await users.updateRole(updated.userId, "especialista");
      }
    }

    return NextResponse.json({
      ok: true,
      specialist: {
        id: updated.id,
        status: updated.status,
        userId: updated.userId,
        specialty: updated.specialty,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update specialist";
    const code = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status: code });
  }
}
