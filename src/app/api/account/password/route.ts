import { currentUser, setPassword, validPassword, verifyPassword } from "@/server/accounts";
import { allowAuthAttempt, authFailed } from "@/server/limits";
import { setSessionCookie } from "@/server/session-cookie";
import { parseBody, passwordChange } from "@/server/validate";

export const runtime = "nodejs";

/**
 * Ajustes → Alterar senha. The signed-in person only (a session cookie, never the API key): the
 * current password, then the new one. Every other session is retired; this one is re-signed.
 * A route rather than a server action: an action that sets a cookie on a screen full of
 * prefetching links could leave its form pending in the browser.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await parseBody(req, passwordChange);
  if (!parsed.ok) return parsed.response;
  if (!(await allowAuthAttempt("login", user.email))) return Response.json({ error: "limited" }, { status: 429 });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    await authFailed();
    return Response.json({ error: "wrong" }, { status: 400 });
  }
  if (!validPassword(parsed.data.next)) return Response.json({ error: "password" }, { status: 400 });
  await setSessionCookie(user.id, await setPassword(user.id, parsed.data.next));
  console.info("[auth] password changed from settings");
  return Response.json({ ok: true });
}

