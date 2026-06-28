import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-protected-pathname", request.nextUrl.pathname);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  },
  {
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  // Список путей, которые должны быть доступны только после входа в систему.
  matcher: [
    "/",
    "/malli/:path*",
    "/templates/:path*",
    "/ai-tools/:path*",
    "/pikaohjeet/:path*",
    "/links/:path*",
    "/literature/:path*",
    "/medicines/:path*",
    "/calculators/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/api/chat/:path*",
    "/api/templates/:path*",
    "/api/ai-tools/:path*",
    "/api/profile/:path*",
    "/api/literature/:path*",
    "/api/admin/:path*",
    "/api/pikaohjeet-v2/:path*",
  ],
};
