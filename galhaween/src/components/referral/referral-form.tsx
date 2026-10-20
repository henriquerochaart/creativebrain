"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { entrySchema } from "@/lib/validation";
import { BloodButton } from "../blood-button";
import { ShareLink } from "./share-link";

const SAVED = "gw_my_ref";

/** Name and e-mail in, invite link out. Remembers the code on this device. */
export function ReferralForm({ shareMessage }: { shareMessage: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try {
      setCode(localStorage.getItem(SAVED));
    } catch {}
  }, []);

  if (code) {
    return (
      <div className="space-y-5">
        <p className="text-lg text-bone">Este é o seu link. Cada amigo que entrar por ele e tiver o Pix confirmado vira um morcego no seu placar.</p>
        <ShareLink code={code} message={shareMessage} />
        <Link href={`/indique/${code}`} className="btn-ghost w-full">
          Ver meu placar
        </Link>
        <button
          type="button"
          className="w-full text-sm text-bone-3 underline underline-offset-4"
          onClick={() => {
            try {
              localStorage.removeItem(SAVED);
            } catch {}
            setCode(null);
          }}
        >
          Não é você? Pegar outro link
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = entrySchema.safeParse({ name, email });
        if (!parsed.success) return setError(parsed.error.issues[0].message);
        setSending(true);
        setError(null);
        const website = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
        const response = await fetch("/api/referrers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...parsed.data, website }),
        }).catch(() => null);
        const result = (await response?.json().catch(() => null)) as { ok?: boolean; code?: string | null; error?: string } | null;
        setSending(false);
        if (!result?.ok || !result.code) return setError(result?.error ?? "Sem conexão. Tente de novo.");
        try {
          localStorage.setItem(SAVED, result.code);
        } catch {}
        setCode(result.code);
      }}
    >
      <div>
        <label htmlFor="ref-name" className="label">
          Seu nome
        </label>
        <input id="ref-name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </div>
      <div>
        <label htmlFor="ref-email" className="label">
          Seu e-mail
        </label>
        <input
          id="ref-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="ref-website">Site</label>
        <input id="ref-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && (
        <p role="alert" className="rounded-[2px] border border-blood/50 bg-ember/30 px-4 py-3 text-base text-bone">
          {error}
        </p>
      )}
      <BloodButton type="submit" disabled={sending} className="w-full">
        {sending ? "Invocando…" : "Pegar meu link"}
      </BloodButton>
    </form>
  );
}
