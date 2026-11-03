"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, findUserByEmail, ownerEmail, passwordHashOf, registerUser, setPassword, validCredentials, validEmail, validPassword } from "@/server/accounts";
import { RESET_MINUTES, SESSION_COOKIE, SESSION_DAYS, WELCOME_COOKIE, readResetToken, resetToken, signSession } from "@/lib/session";
import { BASE_PATH } from "@/lib/base-path";
import { publicOrigin } from "@/server/origin";

/** The error, and the email typed, since React resets the form after the action: it comes back filled in. */
export type AuthState = { error: "email" | "password" | "wrong" | "closed" | "taken" | "server" | null; email?: string };

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
  let userId: string;
  try {
    const user = await authenticate(email, password);
    if (!user) {
      console.info("[auth] login: wrong email or password");
      return { error: "wrong", email };
    }
    userId = user.id;
    await signIn(userId);
  } catch (err) {
    console.error("[auth] login failed:", err instanceof Error ? err.message : err);
    return { error: "server", email };
  }
  redirect(safeNext(form.get("next")));
}

/** Each outcome goes to the logs (never the address or the password), so a failure can be traced. */
export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const invalid = validCredentials(email.trim(), password);
  if (invalid) {
    console.info(`[auth] register: invalid ${invalid}`);
    return { error: invalid, email };
  }
  try {
    const { user, reason } = await registerUser(email, password);
    if (!user) {
      console.info(`[auth] register: ${reason}`);
      return { error: reason ?? "closed", email };
    }
    await signIn(user.id);
    console.info("[auth] register: account created");
  } catch (err) {
    console.error("[auth] register failed:", err instanceof Error ? err.message : err);
    return { error: "server", email };
  }
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: BASE_PATH || "/" });
  redirect("/login");
}

export type ForgotState = { sent: boolean; error: "email" | "server" | null; email?: string };

/**
 * Forgot password. The Brain sends no email, so the reset link goes to the server logs (Vercel →
 * Logs), which only whoever runs the deploy can read: it works for the owner, and for anyone else
 * through them. The answer on screen is the same whether the address has an account or not.
 */
export async function requestReset(_: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get("email") ?? "").trim();
  if (!validEmail(email)) return { sent: false, error: "email", email };
  try {
    const user = await findUserByEmail(email);
    if (user) {
      const link = `${await publicOrigin()}${BASE_PATH}/reset?token=${await resetToken(user.id, user.passwordHash)}`;
      console.info(`[auth] reset link, valid ${RESET_MINUTES} minutes, works once: ${link}`);
    } else {
      // The owner may not remember which address the Brain's first account uses: the logs say it,
      // for whoever can read them (they can already read reset links). The screen says nothing.
      console.info(`[auth] reset: no account for that address. The first account is ${(await ownerEmail()) ?? "not created yet"}`);
    }
  } catch (err) {
    console.error("[auth] reset failed:", err instanceof Error ? err.message : err);
    return { sent: false, error: "server", email };
  }
  return { sent: true, error: null, email };
}

export type ResetState = { error: "password" | "expired" | "server" | null };

/** A new password from a reset link; it signs the account in and the link stops working. */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const password = String(form.get("password") ?? "");
  try {
    const userId = await readResetToken(String(form.get("token") ?? ""), passwordHashOf);
    if (!userId) return { error: "expired" };
    if (!validPassword(password)) return { error: "password" };
    await setPassword(userId, password);
    await signIn(userId);
    console.info("[auth] reset: password changed");
  } catch (err) {
    console.error("[auth] reset failed:", err instanceof Error ? err.message : err);
    return { error: "server" };
  }
  redirect("/");
}

/** The welcome cards were seen or skipped: later signed-out visits go straight to Login. */
export async function seenWelcome(to: "/login" | "/register") {
  (await cookies()).set(WELCOME_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: BASE_PATH || "/", maxAge: 365 * 86_400 });
  redirect(to);
}
