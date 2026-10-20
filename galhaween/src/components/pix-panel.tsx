"use client";

import { useState } from "react";
import { copyText } from "@/lib/clipboard";
import { Toast } from "./toast";

interface Props {
  payload: string;
  pixKey: string;
  keyDisplay: string;
  keyKind: string;
  recipient: string;
  amount: string;
  qrSvg: string;
}

/**
 * Most guests open this page on the phone they pay with, where a QR Code on the same screen is
 * useless, so copia e cola leads and the code sits beside it for paying from another device.
 */
export function PixPanel({ payload, pixKey, keyDisplay, keyKind, recipient, amount, qrSvg }: Props) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  async function copy(text: string, message: string) {
    const ok = await copyText(text);
    setToast({ id: Date.now(), message: ok ? message : "Não deu para copiar. Segure o texto e copie." });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_15rem] md:items-start">
      <div className="space-y-6">
        <div>
          <p className="label">Valor</p>
          <p className="font-display text-3xl text-bone">{amount}</p>
        </div>

        {/* The one action most guests need, first: copy, open the bank app, paste. */}
        <div>
          <button type="button" className="btn-blood w-full sm:w-auto" onClick={() => copy(payload, "Pix copia e cola copiado")}>
            Copiar código Pix
          </button>
          <p className="mt-3 text-base text-bone-2">
            No app do banco: <span className="text-bone">Pix → Pix copia e cola</span>, cole e confirme.
          </p>
        </div>

        <dl className="space-y-5">
          <div>
            <dt className="label">Quem recebe</dt>
            <dd className="text-xl text-bone">
              {recipient}
              <span className="mt-1 block text-base text-bone-2 italic">Confira esse nome no app do banco antes de confirmar.</span>
            </dd>
          </div>
          <div>
            <dt className="label">Ou use a chave Pix ({keyKind})</dt>
            <dd className="flex flex-wrap items-center gap-3">
              <span className="text-2xl text-bone tabular-nums">{keyDisplay}</span>
              <button type="button" className="btn-ghost" onClick={() => copy(pixKey, "Chave copiada")}>
                Copiar chave
              </button>
            </dd>
          </div>
        </dl>

        <details className="text-base text-bone-3">
          <summary className="cursor-pointer hover:text-bone-2">Ver o código</summary>
          <p className="mt-2 rounded-[2px] bg-black/40 p-3 font-mono text-xs break-all text-bone-2 select-all">{payload}</p>
        </details>
      </div>

      <figure className="mx-auto w-full max-w-[15rem]">
        <div
          className="overflow-hidden rounded-[2px] border-4 border-blood/70 bg-parchment shadow-[0_0_50px_-10px_rgb(193_18_31/0.6)] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          role="img"
          aria-label={`QR Code Pix de ${amount}`}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <figcaption className="mt-3 text-center text-base text-bone-2 italic">Ou escaneie de outro celular</figcaption>
      </figure>

      <div className="md:col-span-2">
        <a href="#comprovante" className="eyebrow inline-flex items-center gap-2 text-bone hover:text-blood-2">
          Já fiz o Pix <span aria-hidden>↓</span>
        </a>
      </div>

      {toast && <Toast key={toast.id} message={toast.message} />}
    </div>
  );
}
