import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured, getAdminApp } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * GET /api/specialists — public directory of active specialists.
 * Uses dynamic firebase-admin/firestore import (avoids Auth/jose ESM crash).
 */
export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured" },
      { status: 503 },
    );
  }

  try {
    getAdminApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const snap = await db
      .collection("specialists")
      .where("status", "==", "active")
      .get();

    const specialists = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userId = String(data.userId ?? doc.id);
        const userSnap = await db.collection("users").doc(userId).get();
        const user = userSnap.data() ?? {};
        return {
          id: doc.id,
          specialty: typeof data.specialty === "string" ? data.specialty : "",
          location: typeof data.location === "string" ? data.location : "",
          bio: typeof data.bio === "string" ? data.bio : "",
          rating: typeof data.rating === "number" ? data.rating : null,
          displayName:
            typeof user.displayName === "string"
              ? user.displayName
              : "Especialista",
        };
      }),
    );

    return NextResponse.json({ specialists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list specialists";
    console.error("[GET /api/specialists]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
