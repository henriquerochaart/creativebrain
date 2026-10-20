"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BloodButton } from "../blood-button";

export function LoginForm({ destination }: { destination: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  return (
    <form
      className="mt-8 space-y-5 text-left"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }).catch(() => null);
        const result = (await response?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (result?.ok) {
          router.replace(destination);
          router.refresh();
        } else {
          setError(result?.error ?? "Sem conexão.");
          setSending(false);
        }
      }}
    >
      <div>
        <label htmlFor="password" className="label">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>
      {error && (
        <p role="alert" className="text-base text-blood-2">
          {error}
        </p>
      )}
      <BloodButton type="submit" disabled={sending || !password} className="w-full">
        {sending ? "Abrindo…" : "Entrar"}
      </BloodButton>
    </form>
  );
}
