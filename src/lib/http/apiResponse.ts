import "server-only";

import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import {
  getRequestContext,
  withRequestHeaders,
  type RequestContext,
} from "@/lib/http/requestContext";
import { logServer } from "@/lib/observability/logger";

export function jsonOk<T extends Record<string, unknown>>(
  ctx: RequestContext,
  body: T,
  init?: ResponseInit,
) {
  return NextResponse.json(body, withRequestHeaders(init, ctx));
}

export function jsonError(
  ctx: RequestContext,
  status: number,
  error: string,
  extra?: Record<string, unknown>,
) {
  logServer("warn", "api_error", {
    requestId: ctx.requestId,
    status,
    error,
    ...extra,
  });
  return NextResponse.json(
    { error, requestId: ctx.requestId, ...extra },
    withRequestHeaders({ status }, ctx),
  );
}

export function zodErrorResponse(ctx: RequestContext, err: ZodError) {
  const flat = err.flatten();
  return jsonError(ctx, 400, "Validation failed", {
    issues: flat.fieldErrors,
    formErrors: flat.formErrors,
  });
}

export function beginApiRequest(request: Request): RequestContext {
  const ctx = getRequestContext(request);
  logServer("info", "api_request", {
    requestId: ctx.requestId,
    method: request.method,
    path: new URL(request.url).pathname,
  });
  return ctx;
}

/** Parse JSON body; on failure returns null (caller maps to 400). */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
