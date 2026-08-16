import { NextResponse } from "next/server";
import { listDirectorySpecialists } from "@/lib/specialists/listDirectorySpecialists";

export const runtime = "nodejs";

/**
 * GET /api/specialists — public directory of active specialists.
 * Same source as the SSR specialists page (keep booking forms on client).
 */
export async function GET() {
  try {
    const specialists = await listDirectorySpecialists();
    return NextResponse.json({ specialists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list specialists";
    console.error("[GET /api/specialists]", message);
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
