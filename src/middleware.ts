import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, WELCOME_COOKIE } from "@/lib/session";
import { sessionUser } from "@/server/tenant";

/** Screens a signed-out visitor may open. */
const PUBLIC_PAGES = new Set(["/welcome", "/login", "/register", "/forgot", "/reset"]);

/**
 * The gate. Every page needs a signed-in account: without one, a visit goes to the welcome cards
 * (first time) or to Login (after), and comes back to where it was headed. The API answers 401
 * unless the request carries its own credential (an agent's key, the Shortcut's capture token),
 * which the route checks (server/auth.ts). Public files never reach here (see the matcher).
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();
  // Signature, expiry and the account's session version (a password change retires old cookies).
  if (await sessionUser(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    // Capture answers a Shortcut without a token itself, with a line it can show as a notification.
    if (pathname === "/api/capture") return NextResponse.next();
    const credential = req.headers.has("authorization") || req.headers.has("x-api-key") || req.nextUrl.searchParams.has("token");
    return credential ? NextResponse.next() : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = req.cookies.has(WELCOME_COOKIE) ? "/login" : "/welcome";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Node, not edge: the session secret falls back to DATABASE_URL, and on Node the middleware is
  // certain to read the same environment as the functions that sign the cookie.
  runtime: "nodejs",
  // Everything except Next's assets and the files in public/ (icons, mascot, social cover, worker).
  matcher: ["/((?!_next/|favicon\\.ico|icons/|mascot/|social/|sw\\.js|manifest\\.webmanifest).*)"],
};
