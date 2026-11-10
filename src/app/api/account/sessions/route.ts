import { bumpSessionVersion, currentUser } from "@/server/accounts";
import { setSessionCookie } from "@/server/session-cookie";

export const runtime = "nodejs";

/** Ajustes → Sair dos outros aparelhos: retires every session, then re-signs this one. */
export async function POST() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  await setSessionCookie(user.id, await bumpSessionVersion(user.id));
  return Response.json({ ok: true });
}
