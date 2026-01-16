export { default } from "next-auth/middleware";

export const config = { 
  // Список путей, которые будут защищены паролем
  matcher: [
    "/",
    "/templates/:path*",
    "/calculators/:path*",
    "/api/chat/:path*", // Защищаем и AI чат тоже
  ] 
};
