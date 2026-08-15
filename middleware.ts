import { NextResponse, type NextRequest } from "next/server";

// Edge-safe middleware: only checks for the Supabase auth cookie.
// Real session validation happens in server components via createClient().
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token") && c.value.length > 0);
}

export function middleware(request: NextRequest) {
  const loggedIn = hasSupabaseSession(request);
  const isAuthPage = request.nextUrl.pathname.startsWith("/login");

  if (!loggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (loggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.png$).*)"],
};
