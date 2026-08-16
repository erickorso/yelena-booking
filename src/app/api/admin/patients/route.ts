import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import {
  paginateSlice,
  parseListPagination,
} from "@/lib/admin/listPagination";
import { matchesPatientQuery } from "@/lib/patients/patientSearch";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

/**
 * GET /api/admin/patients?q=&page=1&pageSize=10
 * Search + paginated public patient profiles for admin.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const { page, pageSize, q } = parseListPagination(
      new URL(request.url).searchParams,
    );
    const users = new AdminUserRepository();
    const [patients, specialists] = await Promise.all([
      users.listPatients(500),
      users.listAllSpecialists(),
    ]);
    const specialistByUser = new Map(
      specialists.map((s) => [s.userId, s] as const),
    );

    let rows = patients.map((p) => {
      const spec = specialistByUser.get(p.id);
      return {
        id: p.id,
        email: p.email,
        displayName: p.displayName,
        patientNumber: p.patientNumber,
        locale: p.locale,
        timezone: p.timezone,
        createdAt: p.createdAt.toISOString(),
        canPromote: !spec,
        specialistStatus: spec?.status ?? null,
        specialty: spec?.specialty ?? null,
      };
    });

    if (q) {
      rows = rows.filter((p) => matchesPatientQuery(q, p));
    }

    const result = paginateSlice(rows, page, pageSize);

    return NextResponse.json({
      patients: result.items,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      q,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list patients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
