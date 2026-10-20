"use client";

import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { referralUrl, whatsappShare } from "@/lib/referral";
import { Toast } from "../toast";

/** The guest's invite link with copy and WhatsApp buttons. */
export function ShareLink({ code, message }: { code: string; message: string }) {
  const [url, setUrl] = useState(`/?i=${code}`);
  const [toast, setToast] = useState<number | null>(null);
  useEffect(() => setUrl(referralUrl(window.location.origin, code)), [code]);

  return (
    <div className="space-y-3">
      <p className="rounded-[2px] border border-rule bg-black/70 px-4 py-3 font-display text-lg break-all text-bone">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            if (await copyText(url)) setToast(Date.now());
          }}
        >
          Copiar link
        </button>
        <a className="btn-ghost" href={whatsappShare(`${message} ${url}`)} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>
      {toast && <Toast key={toast} message="Link copiado" />}
    </div>
  );
}
