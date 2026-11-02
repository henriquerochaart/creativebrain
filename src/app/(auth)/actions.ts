"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, registerOwner, validCredentials } from "@/server/accounts";
import { SESSION_COOKIE, SESSION_DAYS, WELCOME_COOKIE, signSession } from "@/lib/session";
import { BASE_PATH } from "@/lib/base-path";

/** The error, and the email typed, since React resets the form after the action: it comes back filled in. */
export type AuthState = { error: "email" | "password" | "wrong" | "closed" | null; email?: string };

/** Only a path inside the app, never another site: `next` arrives in the URL. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

async function signIn(userId: string) {
  const jar = await cookies();
  const common = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: BASE_PATH || "/" };
  jar.set(SESSION_COOKIE, await signSession(userId), { ...common, maxAge: SESSION_DAYS * 86_400 });
  jar.set(WELCOME_COOKIE, "1", { ...common, maxAge: 365 * 86_400 });
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const user = await authenticate(email, password);
  if (!user) return { error: "wrong", email };
  await signIn(user.id);
  redirect(safeNext(form.get("next")));
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const invalid = validCredentials(email.trim(), password);
  if (invalid) return { error: invalid, email };
  const user = await registerOwner(email, password);
  if (!user) return { error: "closed", email };
  await signIn(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: BASE_PATH || "/" });
  redirect("/login");
}

/** The welcome cards were seen or skipped: later signed-out visits go straight to Login. */
export async function seenWelcome(to: "/login" | "/register") {
  (await cookies()).set(WELCOME_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: BASE_PATH || "/", maxAge: 365 * 86_400 });
  redirect(to);
}
