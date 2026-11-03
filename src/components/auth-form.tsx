"use client";

import { useActionState } from "react";
import { login, register, requestReset, resetPassword, type AuthState, type ForgotState, type ResetState } from "@/app/(auth)/actions";
import { useT } from "./lang-provider";
import { BrainThink } from "./brain-think";

/**
 * The two fields and the button, for Login and Register alike. Labels are the placeholders and
 * the accessible names; the only other text is an error, when there is one.
 */
const field = "h-12 w-full rounded-[12px] bg-fill px-4 text-[17px] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent-ink/40";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const d = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, { error: null });
  return (
    <form action={action} noValidate className="mt-6 w-full space-y-3 lg:mt-8">
      <input type="hidden" name="next" value={next} />
      {/* No required/minLength: the browser's own validation bubble is easy to miss (and absent in
          some Home Screen apps), which reads as a button that does nothing. The server answers
          every case with one of the lines below. */}
      <input name="email" type="email" defaultValue={state.email} autoComplete={mode === "login" ? "username" : "email"} inputMode="email" autoCapitalize="none" spellCheck={false} placeholder={d.auth.email} aria-label={d.auth.email} className={field} />
      <input
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder={d.auth.password}
        aria-label={d.auth.password}
        className={field}
      />
      {state.error && (
        <p role="alert" className="px-1 text-[15px] text-danger">
          {d.auth.errors[state.error]}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-filled mt-2 h-14 w-full text-[17px]">
        {pending ? <BrainThink className="h-6 w-6" /> : mode === "login" ? d.auth.login : d.auth.register}
      </button>
    </form>
  );
}

/** Forgot password: the address, then where the link went (the Brain sends no email). */
export function ForgotForm({ minutes }: { minutes: number }) {
  const d = useT();
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, { sent: false, error: null });
  return (
    <form action={action} noValidate className="mt-6 w-full space-y-3 lg:mt-8">
      <input name="email" type="email" defaultValue={state.email} autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder={d.auth.email} aria-label={d.auth.email} className={field} />
      {state.error && (
        <p role="alert" className="px-1 text-[15px] text-danger">
          {d.auth.errors[state.error]}
        </p>
      )}
      {state.sent && (
        <p role="status" className="px-1 text-[15px] text-ink">
          {d.auth.sent(minutes)}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-filled mt-2 h-14 w-full text-[17px]">
        {pending ? <BrainThink className="h-6 w-6" /> : d.auth.getLink}
      </button>
    </form>
  );
}

/** The new password, from a reset link; on success the action signs in and opens the library. */
export function ResetForm({ token, email }: { token: string; email: string }) {
  const d = useT();
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, { error: null });
  return (
    <form action={action} noValidate className="mt-6 w-full space-y-3 lg:mt-8">
      <input type="hidden" name="token" value={token} />
      {/* For the password manager: it files the new password under this account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <input name="password" type="password" autoComplete="new-password" placeholder={d.auth.newPassword} aria-label={d.auth.newPassword} className={field} />
      {state.error && (
        <p role="alert" className="px-1 text-[15px] text-danger">
          {d.auth.errors[state.error]}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-filled mt-2 h-14 w-full text-[17px]">
        {pending ? <BrainThink className="h-6 w-6" /> : d.auth.savePassword}
      </button>
    </form>
  );
}
