import { ADMIN_COOKIE, adminPassword, MIN_PASSWORD_LENGTH, passwordMatches, SESSION_SECONDS, signSession } from "@/server/auth";
import { fail, json } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const password = adminPassword();
  if (!password) {
    return fail(`Defina ADMIN_PASSWORD (pelo menos ${MIN_PASSWORD_LENGTH} caracteres) no ambiente do servidor.`, 503);
  }
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const given = typeof body?.password === "string" ? body.password : "";
  if (!passwordMatches(given, password)) {
    // Slows down guessing without any state to keep.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return fail("Senha errada.", 401);
  }
  const response = json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    [
      `${ADMIN_COOKIE}=${signSession(password)}`,
      "Path=/",
      `Max-Age=${SESSION_SECONDS}`,
      "HttpOnly",
      "SameSite=Lax",
      ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
    ].join("; "),
  );
  return response;
}
