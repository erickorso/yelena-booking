import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "@/lib/auth/sessionCookie";

const intlMiddleware = createMiddleware(routing);

/**
 * Soft-gates `/dashboard` with a client session cookie + stamps request ids.
 * Real auth remains Firebase Bearer on APIs (see docs/ARCHITECTURE.md).
 */
export default function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const { pathname } = request.nextUrl;
  const isDashboard = /\/(es|en)\/dashboard(\/|$)/.test(pathname);
  if (isDashboard && !request.cookies.get(SESSION_COOKIE)?.value) {
    const locale = pathname.startsWith("/en") ? "en" : "es";
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(login);
    redirect.headers.set("x-request-id", requestId);
    return redirect;
  }

  const response = intlMiddleware(request);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/", "/(es|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
