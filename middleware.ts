export { default } from "next-auth/middleware";

export const config = { 
  // Список путей, которые будут защищены паролем
  matcher: [
    "/",
    "/templates/:path*",
    "/ai-tools/:path*",
    "/pikaohjeet/:path*",
    "/links/:path*",
    "/medicines/:path*",
    "/calculators/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/api/chat/:path*", // Защищаем и AI чат тоже
  ] 
};
