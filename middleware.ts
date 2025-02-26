// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 1. Get the `appwrite-session` cookie
  const sessionCookie = request.cookies.get("appwrite-session");

  // 2. Define protected routes
  const protectedRoutes = ["/dashboard", "/profile", "/transactions"]; // Add your protected routes here

  // 3. Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // 4. If the route is protected and the session cookie is missing, redirect to sign-in
  if (isProtectedRoute && !sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // 5. If the user is authenticated, allow the request to proceed
  return NextResponse.next();
}

// 6. Define the routes to apply the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sign-in (sign-in page)
     * - sign-up (sign-up page)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up).*)",
  ],
};