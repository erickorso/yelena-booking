import { NextResponse } from "next/server";

/**
 * Legacy path — redirect clients to POST /api/files.
 * Kept so old callers get a clear message.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Use POST /api/files with scope=patient_general|appointment|specialist_profile",
    },
    { status: 410 },
  );
}
