import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BloodLink } from "@/components/blood-button";
import { NightSky } from "@/components/night-sky";
import { BatMeter } from "@/components/referral/bat-meter";
import { ShareLink } from "@/components/referral/share-link";
import { SparkleHeading } from "@/components/sparkle";
import { event } from "@/config/event";
import { brl, firstName } from "@/lib/format";
import { inviteMessage } from "@/lib/share";
import { NoDatabase } from "@/components/no-database";
import { dbConfigured } from "@/server/db";
import { getStore } from "@/server/store";

export const metadata: Metadata = { title: "Placar de morcegos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** A referrer's scoreboard. Public by code, so it shows a first name and a count, nothing else. */
export default async function Placar({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!dbConfigured()) return <NoDatabase />;
  const store = await getStore();
  const referrer = await store.referrerByCode(code);
  if (!referrer) notFound();
  const count = await store.referralCount(code);
  const goal = event.referralGoal;
  const left = Math.max(goal - count, 0);
  const name = firstName(referrer.name);

  return (
    <main className="relative min-h-[100svh] overflow-x-clip pb-20">
      <div className="absolute inset-x-0 top-0 h-[28rem]">
        <NightSky />
      </div>
      <div className="relative z-10 mx-auto max-w-xl px-4 pt-20 text-center">
        <SparkleHeading as="p" className="pt-4">
          Placar de {name}
        </SparkleHeading>
        <h1 className="section-title mt-5">
          {Math.min(count, goal)} de {goal}
          <br />
          morcegos
        </h1>
        <div className="mt-8">
          <BatMeter count={count} goal={goal} size={40} />
        </div>
        <p className="mt-8 text-lg text-bone">
          {left > 0
            ? `Faltam ${left}. Cada amigo conta quando o Pix dele é confirmado.`
            : referrer.rewardStatus === "ticket_issued"
              ? "Conseguiu. Sua entrada grátis foi para o seu e-mail."
              : referrer.rewardStatus === "refunded"
                ? `Conseguiu. Os ${brl(event.price)} do seu Pix foram devolvidos.`
                : "Conseguiu. A organização vai liberar sua entrada grátis ou devolver o seu Pix em breve."}
        </p>
        <div className="mt-8 text-left">
          <p className="label">Seu link de convite</p>
          <ShareLink code={referrer.code} message={inviteMessage()} />
        </div>
        <div className="mt-12 border-t border-rule pt-8">
          <p className="text-base text-bone-2">Chegou aqui por um convite de {name}?</p>
          <BloodLink href={`/garantir?i=${referrer.code}`} className="mt-4 w-full">
            Garanta sua entrada
          </BloodLink>
        </div>
      </div>
    </main>
  );
}
