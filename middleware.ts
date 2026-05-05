export { default } from "next-auth/middleware";

export const config = {
  // Список путей, которые должны быть доступны только после входа в систему.
  matcher: [
    "/",
    "/malli/:path*",
    "/templates/:path*",
    "/ai-tools/:path*",
    "/pikaohjeet/:path*",
    "/links/:path*",
    "/medicines/:path*",
    "/calculators/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/api/chat/:path*",
    "/api/templates/:path*",
    "/api/ai-tools/:path*",
    "/api/profile/:path*",
    "/api/admin/:path*",
    "/api/pikaohjeet-v2/:path*",
  ],
};
