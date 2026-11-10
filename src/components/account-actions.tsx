"use client";

import { useState } from "react";
import { withBase } from "@/lib/base-path";
import { useT } from "./lang-provider";
import { BrainThink } from "./brain-think";

type ErrorKey = "password" | "wrong" | "owner" | "limited" | "server";

const field = "h-11 w-full rounded-[10px] bg-fill px-3 text-[16px] text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-accent-ink/40 lg:h-10";
const row = "flex min-h-12 items-center justify-between gap-3 py-2";

/** POSTs (or DELETEs) JSON to an account route: null on success, else the error the route named. */
async function call(path: string, method: "POST" | "DELETE", body?: unknown): Promise<ErrorKey | null> {
  try {
    const res = await fetch(withBase(path), { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return null;
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    return (["password", "wrong", "owner", "limited"] as const).find((k) => k === error) ?? "server";
  } catch {
    return "server";
  }
}

/**
 * Ajustes, under the account's address: change the password, download the whole library, sign
 * out other devices, delete the account. The two that change something sit behind a disclosure,
 * so nothing destructive is one tap away. After a change the page reloads, with the new cookie.
 */
export function AccountActions({ owner, changed }: { owner: boolean; changed: boolean }) {
  const d = useT();
  const a = d.account;
  const [pwError, setPwError] = useState<ErrorKey | null>(null);
  const [delError, setDelError] = useState<ErrorKey | null>(null);
  const [busy, setBusy] = useState<"pw" | "sessions" | "delete" | null>(null);

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy("pw");
    const error = await call("/api/account/password", "POST", { current: form.get("current"), next: form.get("next") });
    setPwError(error);
    if (error) return setBusy(null);
    window.location.assign(withBase("/settings?senha=alterada"));
  }

  async function onSessions(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("sessions");
    await call("/api/account/sessions", "POST");
    window.location.reload();
  }

  async function onDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy("delete");
    const error = await call("/api/account", "DELETE", { password: form.get("password") });
    setDelError(error);
    if (error) return setBusy(null);
    window.location.assign(withBase("/login"));
  }

  return (
    <div className="divide-y divide-line">
      <details className="group py-1" open={pwError !== null || changed ? true : undefined}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-ink">
          {a.changePassword}
          <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <form onSubmit={onPassword} className="space-y-2 pb-3">
          <input name="current" type="password" autoComplete="current-password" placeholder={a.current} aria-label={a.current} className={field} />
          <input name="next" type="password" autoComplete="new-password" placeholder={d.auth.newPassword} aria-label={d.auth.newPassword} className={field} />
          {pwError && (
            <p role="alert" className="text-[14px] text-danger">
              {a.errors[pwError]}
            </p>
          )}
          {changed && !pwError && (
            <p role="status" className="text-[14px] text-ink">
              {a.changed}
            </p>
          )}
          <button type="submit" disabled={busy !== null} className="btn-gray h-11 px-4 text-[15px] lg:h-9">
            {busy === "pw" ? <BrainThink className="h-5 w-5" /> : d.auth.savePassword}
          </button>
        </form>
      </details>

      <div className={row}>
        <span className="text-ink">{a.export}</span>
        <a href={withBase("/api/export")} download className="btn-gray inline-flex h-11 items-center px-4 text-[15px] lg:h-9">
          {a.download}
        </a>
      </div>

      <form onSubmit={onSessions} className={row}>
        <span className="text-ink">{a.everywhere}</span>
        <button type="submit" disabled={busy !== null} className="btn-gray h-11 px-4 text-[15px] lg:h-9">
          {busy === "sessions" ? <BrainThink className="h-5 w-5" /> : a.everywhereButton}
        </button>
      </form>

      {!owner && (
        <details className="group py-1" open={delError !== null ? true : undefined}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-danger">
            {a.delete}
            <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <form onSubmit={onDelete} className="space-y-2 pb-3">
            <p className="text-[14px] text-ink-2">{a.deleteWarn}</p>
            <input name="password" type="password" autoComplete="current-password" placeholder={d.auth.password} aria-label={d.auth.password} className={field} />
            {delError && (
              <p role="alert" className="text-[14px] text-danger">
                {a.errors[delError]}
              </p>
            )}
            <button type="submit" disabled={busy !== null} className="h-11 rounded-full bg-danger px-4 text-[15px] font-semibold text-white disabled:opacity-60 lg:h-9">
              {busy === "delete" ? <BrainThink className="h-5 w-5" /> : a.deleteConfirm}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
