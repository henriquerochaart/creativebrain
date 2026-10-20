import type { Metadata } from "next";
import { Divider } from "@/components/divider";
import { NightSky } from "@/components/night-sky";
import { BatMeter } from "@/components/referral/bat-meter";
import { ReferralForm } from "@/components/referral/referral-form";
import { SparkleHeading } from "@/components/sparkle";
import { event } from "@/config/event";
import { brl } from "@/lib/format";
import { inviteMessage } from "@/lib/share";

export const metadata: Metadata = {
  title: `Indique ${event.referralGoal} morcegos`,
  description: `Traga ${event.referralGoal} amigos para a ${event.name} e a sua entrada sai de graça.`,
};

export default function Indique() {
  return (
    <main className="relative min-h-[100svh] overflow-x-clip pb-20">
      <div className="absolute inset-x-0 top-0 h-[28rem]">
        <NightSky />
      </div>
      <div className="relative z-10 mx-auto max-w-xl px-4 pt-20">
        <div className="pt-4 pb-8 text-center">
          <SparkleHeading as="p">Indique e ganhe</SparkleHeading>
          <h1 className="section-title mt-5">
            {event.referralGoal} morcegos.
            <br />
            Sua entrada de graça.
          </h1>
        </div>
        <BatMeter count={0} goal={event.referralGoal} demo />
        <ol className="mt-10 space-y-4 text-base leading-relaxed text-bone">
          <li className="flex gap-3">
            <span className="font-display text-2xl leading-none text-blood">I</span>
            Pegue seu link aqui embaixo e espalhe.
          </li>
          <li className="flex gap-3">
            <span className="font-display text-2xl leading-none text-blood">II</span>
            Cada amigo que garantir a entrada pelo seu link, com o Pix confirmado, acende um morcego no seu placar.
          </li>
          <li className="flex gap-3">
            <span className="font-display text-2xl leading-none text-blood">III</span>
            Chegou a {event.referralGoal}: sua entrada sai de graça. Se você já tiver pago, devolvemos os {brl(event.price)} pelo Pix.
          </li>
        </ol>
        <p className="mt-4 text-sm text-bone-3">
          Cada amigo conta uma vez, e você não conta no próprio placar. Não precisa pagar para pegar o link.
        </p>
        <Divider mark="sparkle" className="my-10" />
        <div className="card px-5 py-7">
          <ReferralForm shareMessage={inviteMessage()} />
        </div>
      </div>
    </main>
  );
}
