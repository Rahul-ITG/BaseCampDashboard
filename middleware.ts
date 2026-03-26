export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login
     * - /setup
     * - /api/auth (NextAuth endpoints)
     * - /api/basecamp (OAuth callback)
     * - /_next (static files)
     * - /favicon.ico
     */
    "/((?!login|setup|api/auth|api/basecamp|_next|favicon.ico).*)",
  ],
};
