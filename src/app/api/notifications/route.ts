import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminNotificationRepository } from "@/repositories/firestore/AdminNotificationRepository";

/**
 * GET /api/notifications — inbox for current user.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const items = await new AdminNotificationRepository().listForUser(auth.uid);
    return NextResponse.json({
      notifications: items.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        meta: n.meta,
        createdAt: n.createdAt.toISOString(),
      })),
      unread: items.filter((n) => !n.readAt).length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
