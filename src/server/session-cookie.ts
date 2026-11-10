import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, WELCOME_COOKIE, signSession } from "@/lib/session";
import { BASE_PATH } from "@/lib/base-path";

const common = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: BASE_PATH || "/" });

/** The session cookie for an account at a session version (and the welcome cookie, seen). */
export async function setSessionCookie(userId: string, version: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId, Date.now(), version), { ...common(), maxAge: SESSION_DAYS * 86_400 });
  jar.set(WELCOME_COOKIE, "1", { ...common(), maxAge: 365 * 86_400 });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: BASE_PATH || "/" });
}
