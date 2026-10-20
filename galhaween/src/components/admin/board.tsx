"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { brl, dateTime, time } from "@/lib/format";
import type { Entry, ReferrerSummary } from "@/server/store";
import { Logo } from "../logo";
import { Toast } from "../toast";

export interface BoardEntry extends Entry {
  /** Names on other entries that uploaded this exact file. */
  sameReceipt: string[];
  /** How many other entries used this e-mail. */
  sameEmail: number;
}

type Filter = "pending" | "approved" | "rejected" | "all" | "referrals";
type Action =
  | { action: "approve" }
  | { action: "reject"; note: string | null; notify: boolean }
  | { action: "resend" }
  | { action: "email"; email: string };
type Outcome = { ok?: boolean; error?: string; mail?: "sent" | "failed" | "not_configured" | "skipped"; mailError?: string; reward?: string | null };

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Pendentes" },
  { id: "approved", label: "Aprovadas" },
  { id: "rejected", label: "Recusadas" },
  { id: "all", label: "Todas" },
  { id: "referrals", label: "Indicações" },
];

const rejectReasons = (price: number) => ["Pix não encontrado no extrato", `Valor diferente de ${brl(price)}`, "Comprovante repetido"];

// Browsers render these inline; HEIC only in Safari, so it gets a download tile elsewhere.
const INLINE_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function receiptUrl(id: string) {
  return `/api/admin/entries/${id}/receipt`;
}

function describe(action: Action["action"], result: Outcome): string {
  const mail = result.mail;
  const failed = mail === "failed" ? `o e-mail falhou (${result.mailError ?? "erro desconhecido"})` : null;
  const off = mail === "not_configured" ? "e-mail não configurado: copie o link e mande pelo WhatsApp" : null;
  switch (action) {
    case "approve":
      if (mail === "skipped") return "Ela já estava aprovada.";
      if (mail === "sent") return "Aprovada. A entrada foi para o e-mail.";
      return `Aprovada, mas ${failed ?? off}.`;
    case "reject":
      if (mail === "sent") return "Recusada e avisada por e-mail.";
      if (mail === "skipped") return "Recusada.";
      return `Recusada, mas ${failed ?? off}.`;
    case "resend":
      if (mail === "sent") return "E-mail reenviado.";
      return `Não reenviou: ${failed ?? off}.`;
    case "email":
      if (mail === "sent") return "E-mail corrigido e entrada reenviada.";
      if (mail === "skipped") return "E-mail corrigido.";
      return `E-mail corrigido, mas ${failed ?? off}.`;
  }
}

export function AdminBoard({
  entries,
  referrers,
  referralGoal,
  price,
  mailReady,
}: {
  entries: BoardEntry[];
  referrers: ReferrerSummary[];
  referralGoal: number;
  price: number;
  mailReady: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<BoardEntry | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  // New submissions show up without a reload while the tab is open.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!viewing) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setViewing(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [viewing]);

  const counts = useMemo(() => {
    const approved = entries.filter((e) => e.status === "approved");
    return {
      pending: entries.filter((e) => e.status === "pending").length,
      approved: approved.length,
      rejected: entries.filter((e) => e.status === "rejected").length,
      all: entries.length,
      referrals: referrers.length,
      checkedIn: approved.filter((e) => e.checkedInAt).length,
      paidApproved: approved.filter((e) => e.kind === "paid").length,
    };
  }, [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (filter === "all" || e.status === filter) &&
        (!q || e.name.toLowerCase().includes(q) || e.email.includes(q) || (e.ticketCode ?? "").toLowerCase().includes(q)),
    );
  }, [entries, filter, query]);

  function notify(message: string) {
    setToast({ id: Date.now(), message });
  }

  async function act(id: string, body: Action): Promise<boolean> {
    const response = await fetch(`/api/admin/entries/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (response?.status === 401) {
      router.replace("/admin/login");
      return false;
    }
    const result = ((await response?.json().catch(() => null)) ?? {}) as Outcome;
    if (!result.ok) {
      notify(result.error ?? "Sem conexão. Tente de novo.");
      return false;
    }
    notify([describe(body.action, result), result.reward].filter(Boolean).join(" "));
    router.refresh();
    return true;
  }

  async function settle(id: string, action: "issue_free" | "mark_refunded"): Promise<void> {
    const response = await fetch(`/api/admin/referrers/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    if (response?.status === 401) return router.replace("/admin/login");
    const result = ((await response?.json().catch(() => null)) ?? {}) as { ok?: boolean; error?: string; message?: string };
    notify(result.ok ? (result.message ?? "Feito.") : (result.error ?? "Sem conexão. Tente de novo."));
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <header className="flex items-center justify-between gap-4 py-6">
        <div className="flex items-baseline gap-3">
          <Logo size="sm" />
          <span className="eyebrow hidden sm:inline">Painel</span>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/porta" className="btn-blood !min-h-11 !px-4 !text-base">
            Ler QR
          </Link>
          {/* The list also refreshes itself every 30 s; on a phone the button is not worth the room. */}
          <button type="button" className="btn-ghost hidden sm:inline-flex" onClick={() => router.refresh()}>
            Atualizar
          </button>
          <button type="button" className="btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pendentes" value={String(counts.pending)} accent={counts.pending > 0} />
        <Stat label="Aprovadas" value={String(counts.approved)} />
        <Stat label="Na porta" value={`${counts.checkedIn} / ${counts.approved}`} />
        <Stat
          label="Aprovado em Pix"
          value={brl(counts.paidApproved * price)}
          hint={`${counts.paidApproved} × ${brl(price)}${counts.approved > counts.paidApproved ? ` + ${counts.approved - counts.paidApproved} grátis` : ""}`}
        />
      </section>

      <p className="mt-5 rounded-[2px] border border-line bg-crypt px-4 py-3 text-base text-bone-2">
        Antes de aprovar, ache o Pix no <span className="text-bone">extrato do banco</span>: valor de {brl(price)}, nome de quem pagou e
        horário. Comprovante sozinho não prova nada, ele pode ser editado. O total aprovado acima tem que bater com o que entrou na conta.
      </p>
      {!mailReady && (
        <p className="mt-3 rounded-[2px] border border-blood/40 bg-ember/30 px-4 py-3 text-base text-bone">
          O envio de e-mail não está configurado (SMTP_HOST, SMTP_USER, SMTP_PASS). Dá para aprovar normalmente e mandar o link da entrada
          pelo WhatsApp.
        </p>
      )}

      <div className="sticky top-0 z-20 -mx-4 mt-6 flex flex-col gap-3 bg-night/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-[2px] px-3.5 py-2 font-display text-base leading-none tracking-[0.03em] uppercase transition-colors ${
                filter === f.id ? "bg-blood text-white" : "text-bone-2 hover:bg-bone/5 hover:text-bone"
              }`}
            >
              {f.label} <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="field min-h-11 py-2 text-base sm:max-w-xs"
          placeholder="Buscar nome, e-mail ou código"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filter === "referrals" ? (
        <ReferrersList referrers={referrers} goal={referralGoal} price={price} onSettle={settle} />
      ) : visible.length === 0 ? (
        <p className="py-24 text-center text-xl text-bone-3 italic">
          {entries.length === 0 ? "Nenhum comprovante ainda. Silêncio de cemitério." : "Nada por aqui."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {visible.map((entry) => (
            <EntryCard key={entry.id} entry={entry} price={price} onView={() => setViewing(entry)} act={act} notify={notify} />
          ))}
        </ul>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Comprovante de ${viewing.name}`}
          onClick={() => setViewing(null)}
        >
          <div className="flex items-center justify-between gap-4 pb-3" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="truncate text-xl text-bone">{viewing.name}</p>
              <p className="text-base text-bone-2">
                Esperado: {brl(price)} · enviado {dateTime(viewing.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a href={receiptUrl(viewing.id)} target="_blank" rel="noreferrer" className="btn-ghost">
                Abrir
              </a>
              <button type="button" className="btn-ghost" onClick={() => setViewing(null)}>
                Fechar
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receiptUrl(viewing.id)} alt={`Comprovante de ${viewing.name}`} className="min-h-0 flex-1 object-contain" />
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} />}
    </main>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-4">
      <p className="label mb-1">{label}</p>
      <p className={`font-display text-3xl leading-tight ${accent ? "text-blood" : "text-bone"}`}>{value}</p>
      {hint && <p className="text-sm text-bone-3">{hint}</p>}
    </div>
  );
}

const STATUS = {
  pending: { label: "Pendente", className: "border-bone-3/50 text-bone-2" },
  approved: { label: "Aprovada", className: "border-bone/60 bg-bone text-night" },
  rejected: { label: "Recusada", className: "border-blood/60 text-blood" },
} as const;

function EntryCard({
  entry,
  price,
  onView,
  act,
  notify,
}: {
  entry: BoardEntry;
  price: number;
  onView: () => void;
  act: (id: string, body: Action) => Promise<boolean>;
  notify: (message: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "rejecting" | "editing">("idle");
  const [busy, setBusy] = useState(false);
  const reasons = rejectReasons(price);
  const [note, setNote] = useState(reasons[0]);
  const [notifyGuest, setNotifyGuest] = useState(true);
  const [email, setEmail] = useState(entry.email);
  const status = STATUS[entry.status];
  const inline = entry.receiptType !== null && INLINE_IMAGES.includes(entry.receiptType);

  async function run(body: Action) {
    setBusy(true);
    const ok = await act(entry.id, body);
    setBusy(false);
    if (ok) setMode("idle");
  }

  async function copyLink() {
    if (!entry.ticketToken) return;
    const ok = await copyText(`${window.location.origin}/entrada/${entry.ticketToken}`);
    notify(ok ? "Link da entrada copiado." : "Não deu para copiar.");
  }

  return (
    <li className="card flex gap-4 p-4">
      {entry.kind === "free" ? (
        <span className="flex h-40 w-24 shrink-0 flex-col items-center justify-center gap-1 self-start rounded-[2px] bg-blood/15 ring-1 ring-blood/50 sm:w-28">
          <span className="font-display text-lg leading-none text-blood uppercase">Grátis</span>
          <span className="px-2 text-center text-xs text-bone-2">10 indicações</span>
        </span>
      ) : inline ? (
        <button type="button" onClick={onView} className="shrink-0 self-start overflow-hidden rounded-[2px] ring-1 ring-line hover:ring-blood" aria-label="Ver comprovante">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receiptUrl(entry.id)} alt="" loading="lazy" className="h-40 w-24 object-cover object-top sm:w-28" />
        </button>
      ) : (
        <a
          href={receiptUrl(entry.id)}
          target="_blank"
          rel="noreferrer"
          className="flex h-40 w-24 shrink-0 flex-col items-center justify-center gap-1 self-start rounded-[2px] bg-bone/5 ring-1 ring-line hover:ring-blood sm:w-28"
        >
          <span className="font-display text-lg text-bone">{entry.receiptType === "application/pdf" ? "PDF" : "HEIC"}</span>
          <span className="text-sm text-bone-2">abrir</span>
        </a>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-xl leading-tight text-bone">{entry.name}</p>
          <span className={`shrink-0 rounded-[2px] border px-2 py-1 font-display text-sm leading-none tracking-[0.03em] uppercase ${status.className}`}>
            {status.label}
          </span>
        </div>

        {mode === "editing" ? (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ action: "email", email });
            }}
          >
            <input type="email" className="field min-h-10 py-1.5 text-base" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <button type="submit" className="btn-ghost" disabled={busy}>
              Salvar
            </button>
            <button type="button" className="btn-ghost" onClick={() => setMode("idle")}>
              ✕
            </button>
          </form>
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-base text-bone-2">
            <span className="break-all">{entry.email}</span>
            <button type="button" className="text-sm text-bone-3 underline underline-offset-2 hover:text-bone" onClick={() => setMode("editing")}>
              corrigir
            </button>
          </p>
        )}
        <p className="text-sm text-bone-3">Enviado {dateTime(entry.createdAt)}</p>

        {entry.sameReceipt.length > 0 && (
          <p className="mt-2 text-base text-blood">⚠ Mesmo arquivo de comprovante que: {entry.sameReceipt.join(", ")}</p>
        )}
        {entry.sameEmail > 0 && (
          <p className="mt-1 text-base text-bone-2">
            Este e-mail tem mais {entry.sameEmail} {entry.sameEmail === 1 ? "envio" : "envios"}.
          </p>
        )}

        {entry.status === "approved" && (
          <div className="mt-3 space-y-0.5 text-base">
            <p className="font-display text-lg tracking-[0.06em] text-bone">{entry.ticketCode}</p>
            <p className={entry.emailError ? "text-blood" : "text-bone-2"}>
              {entry.emailSentAt
                ? `E-mail enviado ${dateTime(entry.emailSentAt)}`
                : entry.emailError
                  ? `E-mail falhou: ${entry.emailError}`
                  : "E-mail não enviado"}
            </p>
            <p className="text-bone-2">{entry.checkedInAt ? `Entrou às ${time(entry.checkedInAt)}` : "Ainda não chegou"}</p>
          </div>
        )}
        {entry.status === "rejected" && entry.note && <p className="mt-2 text-base text-bone-2 italic">“{entry.note}”</p>}

        {mode === "rejecting" ? (
          <div className="mt-4 space-y-3 rounded-[2px] border border-blood/40 bg-ember/20 p-3">
            <div className="flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setNote(reason)}
                  className={`rounded-[2px] border px-3 py-1 text-sm ${note === reason ? "border-blood bg-blood/20 text-bone" : "border-line text-bone-2"}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              className="field min-h-20 text-base"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              aria-label="Motivo"
            />
            <label className="flex items-center gap-2 text-base text-bone-2">
              <input type="checkbox" checked={notifyGuest} onChange={(e) => setNotifyGuest(e.target.checked)} className="h-4 w-4 accent-[var(--color-blood)]" />
              Avisar por e-mail
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost danger"
                disabled={busy}
                onClick={() => run({ action: "reject", note: note.trim() || null, notify: notifyGuest })}
              >
                {entry.status === "approved" ? "Cancelar entrada" : "Recusar"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMode("idle")}>
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.status !== "approved" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ action: "approve" })}
                className="inline-flex min-h-11 items-center rounded-[2px] bg-blood px-4 font-display text-base leading-none tracking-[0.03em] text-white uppercase hover:brightness-110 disabled:opacity-60 lg:min-h-10"
              >
                {busy ? "Aprovando…" : entry.status === "rejected" ? "Aprovar mesmo assim" : `Aprovar · ${brl(price)} ok`}
              </button>
            )}
            {entry.status === "approved" && (
              <>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => run({ action: "resend" })}>
                  Reenviar e-mail
                </button>
                <button type="button" className="btn-ghost" onClick={copyLink}>
                  Copiar link
                </button>
              </>
            )}
            {entry.status !== "rejected" && (
              <button type="button" className="btn-ghost danger" onClick={() => setMode("rejecting")}>
                {entry.status === "approved" ? "Cancelar" : "Recusar"}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function ReferrersList({
  referrers,
  goal,
  price,
  onSettle,
}: {
  referrers: ReferrerSummary[];
  goal: number;
  price: number;
  onSettle: (id: string, action: "issue_free" | "mark_refunded") => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (referrers.length === 0) {
    return <p className="py-24 text-center text-xl text-bone-3 italic">Ninguém trouxe morcegos ainda.</p>;
  }
  return (
    <ul className="mt-4 grid gap-3 lg:grid-cols-2">
      {referrers.map((r) => {
        const done = r.count >= goal;
        const run = async (action: "issue_free" | "mark_refunded") => {
          setBusy(r.id);
          await onSettle(r.id, action);
          setBusy(null);
        };
        return (
          <li key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl leading-tight text-bone">{r.name}</p>
                <p className="text-base break-all text-bone-2">{r.email}</p>
                <p className="text-sm text-bone-3">Link: ?i={r.code}</p>
              </div>
              <p className={`shrink-0 font-display text-3xl leading-none ${done ? "text-blood" : "text-bone"}`}>
                {r.count}/{goal}
              </p>
            </div>
            <div className="mt-3 h-1.5 w-full bg-white/10">
              <div className="h-full bg-blood" style={{ width: `${Math.min(r.count / goal, 1) * 100}%` }} />
            </div>
            {done && (
              <div className="mt-4">
                {r.rewardStatus === "ticket_issued" ? (
                  <p className="text-base text-bone-2">Entrada grátis emitida.</p>
                ) : r.rewardStatus === "refunded" ? (
                  <p className="text-base text-bone-2">Pix de {brl(price)} devolvido.</p>
                ) : r.ownEntry ? (
                  <div className="space-y-2">
                    <p className="text-base text-bone">
                      Já tinha {r.ownEntry === "approved" ? "pago" : "mandado comprovante"}: devolva {brl(price)} pelo app do banco (Devolver Pix, no próprio
                      lançamento) e marque aqui.
                    </p>
                    <button type="button" className="btn-ghost" disabled={busy === r.id} onClick={() => run("mark_refunded")}>
                      Marquei a devolução
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => run("issue_free")}
                    className="inline-flex min-h-11 items-center rounded-[2px] bg-blood px-4 font-display text-base leading-none tracking-[0.03em] text-white uppercase disabled:opacity-60"
                  >
                    Emitir entrada grátis
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
