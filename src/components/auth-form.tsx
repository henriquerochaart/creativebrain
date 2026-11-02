"use client";

import { useActionState } from "react";
import { login, register, type AuthState } from "@/app/(auth)/actions";
import { useT } from "./lang-provider";
import { BrainThink } from "./brain-think";

/**
 * The two fields and the button, for Login and Register alike. Labels are the placeholders and
 * the accessible names; the only other text is an error, when there is one.
 */
export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const d = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, { error: null });
  const field = "h-12 w-full rounded-[12px] bg-fill px-4 text-[17px] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent-ink/40";
  return (
    <form action={action} className="mt-8 w-full space-y-3">
      <input type="hidden" name="next" value={next} />
      <input name="email" type="email" defaultValue={state.email} required autoComplete={mode === "login" ? "username" : "email"} inputMode="email" autoCapitalize="none" spellCheck={false} placeholder={d.auth.email} aria-label={d.auth.email} className={field} />
      <input
        name="password"
        type="password"
        required
        minLength={mode === "register" ? 8 : undefined}
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
