import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";

const ADMIN_PAGES = [
  "/pikaohjeet-v2/clinical-builder",
  "/pikaohjeet-v2/clinical-manager",
];

const ADMIN_API_PREFIXES = [
  "/api/pikaohjeet-v2/ai/create-clinical-card",
  "/api/pikaohjeet-v2/ai/extract-clinical-chunk",
  "/api/pikaohjeet-v2/ai/synthesize-clinical-card",
];

function isAdminPage(pathname: string) {
  return ADMIN_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAdminApi(pathname: string) {
  return ADMIN_API_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const authMiddleware = withAuth({
  pages: { signIn: "/login" },
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAdmin = isAdminPage(pathname) || isAdminApi(pathname);

  if (needsAdmin) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      if (isAdminApi(pathname)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if ((token as any).role !== "ADMIN") {
      if (isAdminApi(pathname)) {
        return NextResponse.json(
          { error: "Ei käyttöoikeutta. Tämä toiminto vaatii ADMIN-roolin." },
          { status: 403 }
        );
      }

      const url = req.nextUrl.clone();
      url.pathname = "/pikaohjeet-v2/no-access";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return (authMiddleware as any)(req);
}

export const config = {
  matcher: [
    "/",
    "/templates/:path*",
    "/malli/:path*",
    "/ai-tools/:path*",
    "/pikaohjeet/:path*",
    "/pikaohjeet-v2/:path*",
    "/pikaohjeet-archive/:path*",
    "/links/:path*",
    "/medicines/:path*",
    "/calculators/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/api/chat/:path*",
    "/api/pikaohjeet-v2/:path*",
  ],
};
