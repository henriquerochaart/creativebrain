import { currentUser, verifyPassword } from "@/server/accounts";
import { deleteAccountData } from "@/server/library";
import { allowAuthAttempt, authFailed } from "@/server/limits";
import { clearSessionCookie } from "@/server/session-cookie";
import { accountDelete, parseBody } from "@/server/validate";

export const runtime = "nodejs";

/**
 * Ajustes → Apagar conta. The password confirms it; the account, its library and its stored files
 * go. The owner's account cannot be deleted here, or the Brain would be left without one.
 */
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (user.isOwner) return Response.json({ error: "owner" }, { status: 403 });
  const parsed = await parseBody(req, accountDelete);
  if (!parsed.ok) return parsed.response;
  if (!(await allowAuthAttempt("login", user.email))) return Response.json({ error: "limited" }, { status: 429 });
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await authFailed();
    return Response.json({ error: "wrong" }, { status: 400 });
  }
  const gone = await deleteAccountData(user.id);
  console.info(`[auth] account deleted: ${gone.references} references, ${gone.files} files`);
  await clearSessionCookie();
  return Response.json({ ok: true });
}
