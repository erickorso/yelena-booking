import { beginApiRequest, jsonError, jsonOk } from "@/lib/http/apiResponse";
import { processOutboxBatch } from "@/application/processOutbox";
import { reconcileBookingSideEffects } from "@/application/reconcileBookingSideEffects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim();
  return header === `Bearer ${secret}`;
}

/**
 * POST /api/cron/reconcile — requeue missing Calendar/mail + drain outbox.
 */
export async function POST(request: Request) {
  const ctx = beginApiRequest(request);
  if (!authorizeCron(request)) {
    return jsonError(ctx, 401, "Unauthorized cron");
  }
  try {
    const reconcile = await reconcileBookingSideEffects(40);
    const drain = await processOutboxBatch(25);
    return jsonOk(ctx, { ok: true, reconcile, drain });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reconcile failed";
    return jsonError(ctx, 500, message);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
