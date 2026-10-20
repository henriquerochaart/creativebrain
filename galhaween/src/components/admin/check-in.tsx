"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { firstName, time } from "@/lib/format";

type State = { kind: "ready" } | { kind: "busy" } | { kind: "in"; at: string } | { kind: "already"; at: string } | { kind: "invalid" } | { kind: "error"; message: string };

/** The door's view of a ticket: one big answer, readable in the dark at arm's length. */
export function CheckIn({ token, name, valid, checkedInAt }: { token: string; name: string; valid: boolean; checkedInAt: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>(
    !valid ? { kind: "invalid" } : checkedInAt ? { kind: "already", at: checkedInAt } : { kind: "ready" },
  );

  async function post(undo = false) {
    setState({ kind: "busy" });
    const response = await fetch(`/api/admin/checkin/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ undo }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as { ok?: boolean; result?: string; checkedInAt?: string; error?: string } | null;
    if (!result?.ok) return setState({ kind: "error", message: result?.error ?? "Sem conexão." });
    if (result.result === "undone") setState({ kind: "ready" });
    else if (result.result === "checked_in") setState({ kind: "in", at: result.checkedInAt! });
    else if (result.result === "already_checked_in") setState({ kind: "already", at: result.checkedInAt! });
    else setState({ kind: "invalid" });
    router.refresh();
  }

  if (state.kind === "in") {
    return (
      <div className="rounded-2xl bg-bone px-6 py-8 text-center text-night">
        <p className="font-display text-4xl font-bold tracking-[0.12em]">Liberado</p>
        <p className="mt-2 text-xl">
          {firstName(name)} entrou às {time(state.at)}
        </p>
        <button type="button" className="mt-4 text-base underline underline-offset-4" onClick={() => post(true)}>
          Desfazer
        </button>
      </div>
    );
  }
  if (state.kind === "already") {
    return (
      <div className="rounded-2xl bg-blood px-6 py-8 text-center text-white">
        <p className="font-display text-3xl font-bold tracking-[0.12em]">Já usada</p>
        <p className="mt-2 text-xl">Esta entrada passou pela porta às {time(state.at)}.</p>
        <button type="button" className="mt-4 text-base underline underline-offset-4" onClick={() => post(true)}>
          Foi engano, liberar de novo
        </button>
      </div>
    );
  }
  if (state.kind === "invalid") {
    return (
      <div className="rounded-2xl bg-blood px-6 py-8 text-center text-white">
        <p className="font-display text-3xl font-bold tracking-[0.12em]">Não vale</p>
        <p className="mt-2 text-xl">Esta entrada foi cancelada no painel.</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <button
        type="button"
        disabled={state.kind === "busy"}
        onClick={() => post()}
        className="w-full rounded-2xl bg-bone px-6 py-6 font-display text-xl font-bold tracking-[0.12em] text-night uppercase disabled:opacity-60"
      >
        {state.kind === "busy" ? "Conferindo…" : `Deixar ${firstName(name)} entrar`}
      </button>
      {state.kind === "error" && <p className="mt-3 text-base text-blood-2">{state.message}</p>}
      <p className="mt-3 text-base text-bone-3">Você está vendo isto porque entrou no painel.</p>
    </div>
  );
}
