import "server-only";

import { randomUUID } from "crypto";

export type RequestContext = {
  requestId: string;
};

const HEADER = "x-request-id";

/** Prefer inbound id (proxy/CDN); otherwise mint one. */
export function getRequestContext(request: Request): RequestContext {
  const incoming = request.headers.get(HEADER)?.trim();
  return { requestId: incoming && incoming.length <= 64 ? incoming : randomUUID() };
}

export function withRequestHeaders(
  init: ResponseInit | undefined,
  ctx: RequestContext,
): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set(HEADER, ctx.requestId);
  return { ...init, headers };
}
