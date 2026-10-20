"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { firstName } from "@/lib/format";
import { entrySchema, MAX_RECEIPT_BYTES, suggestEmail } from "@/lib/validation";
import { Bat } from "./bat";
import { BloodButton } from "./blood-button";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done"; name: string; email: string };

// Above this, photos are re-encoded in the browser before upload; screenshots and PDFs are nearly
// always under it and go untouched, so the duplicate check on the server still sees the original bytes.
const COMPRESS_ABOVE = 3.5 * 1024 * 1024;

async function shrinkImage(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } catch {
    return null; // e.g. HEIC outside Safari
  }
}

function sizeLabel(bytes: number): string {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function EntryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const suggestion = useMemo(() => suggestEmail(email), [email]);
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(files: FileList | null) {
    const chosen = files?.[0];
    if (chosen) {
      setFile(chosen);
      if (status.kind === "error") setStatus({ kind: "idle" });
    }
  }

  async function submit(form: HTMLFormElement) {
    const parsed = entrySchema.safeParse({ name, email });
    if (!parsed.success) return setStatus({ kind: "error", message: parsed.error.issues[0].message });
    if (!file) return setStatus({ kind: "error", message: "Anexe o comprovante do Pix." });

    setStatus({ kind: "sending" });
    let upload: Blob = file;
    let uploadName = file.name || "comprovante";
    if (file.size > COMPRESS_ABOVE && file.type !== "application/pdf") {
      const smaller = await shrinkImage(file);
      if (smaller) {
        upload = smaller;
        uploadName = uploadName.replace(/\.\w+$/, "") + ".jpg";
      }
    }
    if (upload.size > MAX_RECEIPT_BYTES) {
      return setStatus({ kind: "error", message: "O arquivo passou de 4 MB. Mande um print da tela do comprovante." });
    }

    const body = new FormData();
    body.set("name", parsed.data.name);
    body.set("email", parsed.data.email);
    body.set("receipt", upload, uploadName);
    body.set("website", (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "");
    try {
      const response = await fetch("/api/entries", { method: "POST", body });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !result?.ok) {
        const message =
          result?.error ?? (response.status === 413 ? "O arquivo é grande demais. Mande um print da tela." : "Algo deu errado. Tente de novo.");
        return setStatus({ kind: "error", message });
      }
      setStatus({ kind: "done", name: parsed.data.name, email: parsed.data.email });
    } catch {
      setStatus({ kind: "error", message: "Sem conexão. Confira a internet e tente de novo." });
    }
  }

  if (status.kind === "done") return <Success name={status.name} email={status.email} />;

  const sending = status.kind === "sending";

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <div>
        <label htmlFor="name" className="label">
          Nome completo
        </label>
        <input
          id="name"
          name="name"
          className="field"
          autoComplete="name"
          placeholder="Como está no seu documento"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          className="field"
          placeholder="onde a entrada vai chegar"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {suggestion && (
          <button type="button" className="mt-2 text-base text-blood-2 underline underline-offset-4" onClick={() => setEmail(suggestion)}>
            Você quis dizer {suggestion}?
          </button>
        )}
      </div>

      <div>
        <span className="label">Comprovante do Pix</span>
        <label
          htmlFor="receipt"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          className={`flex min-h-36 cursor-pointer items-center gap-4 rounded-[2px] border border-dashed px-5 py-5 transition-colors ${
            dragging ? "border-blood bg-ember/30" : file ? "border-blood/50 bg-bone/5" : "border-bone-3/60 bg-bone/[0.03] hover:border-bone-2"
          }`}
        >
          {file ? (
            <>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-24 w-16 shrink-0 rounded-[2px] object-cover object-top ring-1 ring-line" />
              ) : (
                <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded-[2px] bg-bone/10 font-display text-sm text-bone-2">PDF</span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-lg text-bone">{file.name || "comprovante"}</span>
                <span className="block text-base text-bone-2">{sizeLabel(file.size)} · toque para trocar</span>
              </span>
            </>
          ) : (
            <span className="flex w-full flex-col items-center gap-2 text-center">
              <Bat width={40} className="text-bone-3" />
              <span className="text-lg text-bone">Toque para escolher o print ou o PDF</span>
              <span className="text-base text-bone-3">Imagem ou PDF, até 4 MB</span>
            </span>
          )}
        </label>
        <input id="receipt" type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files)} />
      </div>

      {/* Honeypot: people never see it, bots fill it. */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="website">Site</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {status.kind === "error" && (
        <p role="alert" className="rounded-[2px] border border-blood/50 bg-ember/30 px-4 py-3 text-lg text-bone">
          {status.message}
        </p>
      )}

      <div className="space-y-4 pt-2">
        <BloodButton type="submit" disabled={sending} className="w-full sm:w-auto">
          {sending ? "Conjurando…" : "Enviar comprovante"}
        </BloodButton>
        <p className="text-base text-bone-3">
          Seu nome, e-mail e comprovante servem só para conferir o pagamento e mandar a sua entrada.
        </p>
      </div>
    </form>
  );
}

const BURST = Array.from({ length: 9 }, (_, i) => {
  const angle = (i / 9) * Math.PI * 2 - Math.PI / 2;
  const distance = 120 + (i % 3) * 40;
  return {
    x: `${Math.round(Math.cos(angle) * distance)}px`,
    y: `${Math.round(Math.sin(angle) * distance)}px`,
    r: `${(i % 2 ? 1 : -1) * (20 + i * 7)}deg`,
    delay: `${i * 40}ms`,
    size: 22 + (i % 3) * 8,
  };
});

function Success({ name, email }: { name: string; email: string }) {
  return (
    <div className="relative flex flex-col items-center py-6 text-center" role="status">
      <div className="relative h-36 w-36">
        {BURST.map((bat, i) => (
          <span
            key={i}
            className="burst-bat text-bone-3"
            style={{ "--x": bat.x, "--y": bat.y, "--r": bat.r, animationDelay: bat.delay } as React.CSSProperties}
          >
            <Bat width={bat.size} />
          </span>
        ))}
        <div className="ghost-rise absolute inset-0">
          <svg viewBox="0 0 100 110" className="ghost h-full w-full drop-shadow-[0_0_30px_rgb(239_230_220/0.35)]" aria-hidden>
            <path
              d="M50 6C27 6 14 24 14 48v52l10-8 9 9 9-9 8 9 8-9 9 9 9-9 10 8V48C86 24 73 6 50 6z"
              fill="var(--color-bone)"
            />
            <ellipse cx="38" cy="46" rx="6" ry="9" fill="var(--color-night)" />
            <ellipse cx="62" cy="46" rx="6" ry="9" fill="var(--color-night)" />
            <ellipse cx="50" cy="68" rx="7" ry="9" fill="var(--color-night)" />
          </svg>
        </div>
      </div>
      <h3 className="section-title mt-6 text-3xl">Buu! Recebemos</h3>
      <p className="mt-4 max-w-sm text-xl text-bone">
        Valeu, {firstName(name)}. Assim que o Pix aparecer no extrato, a sua entrada chega em{" "}
        <span className="text-blood-2">{email}</span>.
      </p>
      <p className="mt-3 max-w-sm text-base text-bone-2">Se não aparecer na caixa de entrada, procure no spam e em Promoções.</p>
      <Link href="/" className="btn-ghost mt-8">
        Voltar ao início
      </Link>
    </div>
  );
}
