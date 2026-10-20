import { ADMIN_COOKIE } from "@/server/auth";
import { json } from "@/server/http";

export async function POST() {
  const response = json({ ok: true });
  response.headers.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
