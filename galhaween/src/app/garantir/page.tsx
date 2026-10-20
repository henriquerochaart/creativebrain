import type { Metadata } from "next";
import Link from "next/link";
import { EntryForm } from "@/components/entry-form";
import { Logo } from "@/components/logo";
import { NightSky } from "@/components/night-sky";
import { PixPanel } from "@/components/pix-panel";
import { event } from "@/config/event";
import { brl } from "@/lib/format";
import { pixDetails } from "@/server/pix-config";
import { qrSvg } from "@/server/ticket";

export const metadata: Metadata = { title: "Garanta sua entrada" };

// Reads the Pix account from the environment on each request, so changing it needs no rebuild.
export const dynamic = "force-dynamic";

function StepHeading({ numeral, title, children }: { numeral: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="font-display text-4xl leading-none text-blood">{numeral}</span>
      <div>
        <h2 className="font-display text-lg tracking-[0.12em] text-bone uppercase">{title}</h2>
        {children && <p className="mt-1 text-lg text-bone-2">{children}</p>}
      </div>
    </div>
  );
}

export default async function Garantir() {
  const pix = pixDetails();
  const qr = pix ? await qrSvg(pix.payload) : null;

  return (
    <main className="relative min-h-[100svh] overflow-x-clip pb-24">
      <div className="absolute inset-x-0 top-0 h-[28rem]">
        <NightSky />
      </div>
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:py-6">
        <Link href="/" aria-label="Voltar ao início">
          <Logo size="sm" />
        </Link>
        <Link href="/" className="eyebrow hover:text-bone">
          Voltar
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-4">
        <div className="pt-2 pb-8 text-center sm:pt-8 sm:pb-12">
          <h1 className="section-title">Garanta sua entrada</h1>
          <p className="mx-auto mt-3 max-w-md text-xl text-bone-2 italic">
            Três passos e o seu nome entra na lista. A entrada custa {brl(event.price)}.
          </p>
        </div>

        <section className="card px-5 py-8 sm:px-8" aria-labelledby="step-pix">
          <StepHeading numeral="I" title={`Faça um Pix de ${brl(event.price)}`}>
            O valor já vem preenchido no QR Code e no copia e cola.
          </StepHeading>
          <div id="step-pix" className="mt-8">
            {pix && qr ? (
              <PixPanel
                payload={pix.payload}
                pixKey={pix.key}
                keyDisplay={pix.keyDisplay}
                keyKind={pix.keyKind}
                recipient={pix.name}
                amount={brl(event.price)}
                qrSvg={qr}
              />
            ) : (
              <p className="rounded-xl border border-blood/40 bg-ember/30 px-4 py-4 text-lg text-bone">
                A chave Pix ainda não foi configurada. Volte daqui a pouco.
              </p>
            )}
          </div>
        </section>

        <section id="comprovante" className="card mt-6 scroll-mt-6 px-5 py-8 sm:px-8">
          <StepHeading numeral="II" title="Envie o comprovante">
            Com o seu nome e o e-mail onde quer receber a entrada.
          </StepHeading>
          <div className="mt-8">
            <EntryForm />
          </div>
        </section>

        <section className="mt-6 px-5 sm:px-8">
          <StepHeading numeral="III" title="Receba sua entrada">
            Conferimos o Pix no extrato e mandamos um QR Code para o seu e-mail. É ele que você mostra na porta.
          </StepHeading>
        </section>
      </div>
    </main>
  );
}
