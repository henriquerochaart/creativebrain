import Image from "next/image";
import { BloodLink } from "@/components/blood-button";
import { BatMeter } from "@/components/referral/bat-meter";
import { Divider } from "@/components/divider";
import { Eyes } from "@/components/eyes";
import { Logo } from "@/components/logo";
import { NightSky } from "@/components/night-sky";
import { PosterVideo } from "@/components/poster-video";
import { Reveal } from "@/components/reveal";
import { Sparkle, SparkleHeading } from "@/components/sparkle";
import { Spider } from "@/components/spider";
import { event } from "@/config/event";
import { brl, keepNumber } from "@/lib/format";
import logo from "../../public/logo.png";

const STEPS = [
  { numeral: "I", title: `Faça um Pix de ${brl(event.price)}`, text: "Pela chave ou pelo QR Code, do app do seu banco." },
  { numeral: "II", title: "Envie o comprovante", text: "Junto com seu nome e o e-mail onde quer receber a entrada." },
  { numeral: "III", title: "Receba sua entrada", text: "Conferimos o Pix e mandamos um QR Code para o seu e-mail." },
];

/*
 * The hero rebuilds the poster: logo on top, its animated collage underneath, the date strip below.
 * Both images are cut from the same 1080-wide poster, so placing them by their poster coordinates
 * (as percentages of a stage that spans poster rows 18 to 1060) lines the logo's drips up with the
 * collage exactly, at any screen width.
 */
const POSTER = { width: 1080, top: 18, bottom: 1060 };
const LOGO_BOX = { left: 32, top: 18, width: 1018 };
const VIDEO_BOX = { top: 360, height: 700 };
const stageHeight = POSTER.bottom - POSTER.top;
const pct = (value: number, of: number) => `${(value / of) * 100}%`;

function Detail({ label, value, sub, href }: { label: string; value: string | null; sub?: string | null; href?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 text-center">
      <dt className="eyebrow text-bone-3">{label}</dt>
      <dd className="font-display text-[1.7rem] leading-tight text-bone uppercase">
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noreferrer" className="underline decoration-blood/60 underline-offset-4 hover:decoration-blood-2">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-bone-3 italic">em breve</span>
        )}
        {/* As on the poster: the time in red under the date. */}
        {value && sub && <span className="block text-blood-2">{sub}</span>}
      </dd>
    </div>
  );
}

export default function Home() {
  const where = event.venue ?? event.address;
  const mapsHref = event.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}` : undefined;

  return (
    <main className="overflow-x-clip">
      {/* Hero: the poster, alive */}
      <section className="relative flex flex-col items-center px-0 pt-6 pb-10 text-center sm:min-h-[100svh] sm:justify-center sm:px-4">
        <NightSky />
        <div className="relative w-full max-w-[34rem]" style={{ aspectRatio: `${POSTER.width} / ${stageHeight}` }}>
          <PosterVideo
            className="poster-video absolute left-0 w-full"
            style={{ top: pct(VIDEO_BOX.top - POSTER.top, stageHeight), height: pct(VIDEO_BOX.height, stageHeight) }}
          />
          <h1
            className="absolute"
            style={{ left: pct(LOGO_BOX.left, POSTER.width), top: pct(LOGO_BOX.top - POSTER.top, stageHeight), width: pct(LOGO_BOX.width, POSTER.width) }}
          >
            <Image src={logo} alt={event.name} priority sizes="(max-width: 544px) 95vw, 520px" className="h-auto w-full" />
          </h1>
        </div>

        <div className="relative z-10 w-full max-w-[34rem] px-4">
          <dl className="grid grid-cols-[auto_1fr_auto] items-start border-t border-blood/40 pt-4 font-display text-[0.9rem] leading-[1.1] tracking-[0.01em] text-bone uppercase min-[360px]:text-[1.04rem] min-[380px]:text-[1.16rem] sm:text-[1.6rem]">
            <div className="pr-2.5 text-left whitespace-nowrap">
              <dt className="sr-only">Data</dt>
              <dd>{event.dateShort ?? "Em breve"}</dd>
              {event.time && <dd className="text-blood-2">{event.time}</dd>}
            </div>
            <div className="border-x border-blood/50 px-2.5">
              <dt className="sr-only">Endereço</dt>
              <dd>
                {mapsHref ? (
                  <a href={mapsHref} target="_blank" rel="noreferrer" className="hover:text-blood-2">
                    {event.address && keepNumber(event.address)}
                  </a>
                ) : (
                  "Local em breve"
                )}
              </dd>
            </div>
            <div className="pl-2.5 text-right whitespace-nowrap">
              <dt className="sr-only">Entrada</dt>
              <dd>Pix R$ {event.price}</dd>
              <dd aria-hidden className="mt-1.5 ml-auto h-px w-full bg-blood" />
            </div>
          </dl>
          <SparkleHeading className="mt-5">Concurso de fantasia</SparkleHeading>
          <Divider className="mt-3" />
          <div className="mt-7 flex flex-col items-center gap-3">
            <BloodLink href="/garantir" className="w-full sm:w-auto">
              Garanta sua entrada
            </BloodLink>
            <p className="mt-2 text-base text-bone-2">
              {brl(event.price)} <span className="text-bone-3">·</span> confirmação por e-mail
            </p>
          </div>
        </div>
        <a href="#a-festa" className="eyebrow relative z-10 mt-12 flex flex-col items-center gap-2 text-bone-3 hover:text-bone-2">
          Desça, se tiver coragem
          <span className="block h-6 w-px animate-pulse bg-gradient-to-b from-blood to-transparent" />
        </a>
      </section>

      {/* About */}
      <section id="a-festa" className="relative mx-auto max-w-3xl px-4 py-24 text-center">
        <Spider className="right-4 sm:right-[6%]" thread={56} />
        <Eyes className="top-10 left-5 sm:left-[6%]" size={13} blink={6} delay={1.5} />
        <Reveal>
          <SparkleHeading as="h2">A festa</SparkleHeading>
          <p className="section-title mt-5">
            Venha como quiser.
            <br />
            Saia como puder.
          </p>
          <Divider mark="sparkle" className="mx-auto mt-7 max-w-xs" />
        </Reveal>
        <div className="mt-9 space-y-5 text-lg leading-relaxed text-bone">
          {event.about.map((paragraph, i) => (
            <Reveal key={i} delay={i * 120}>
              <p>{paragraph}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {event.highlights.map((item, i) => (
            <Reveal key={item.title} delay={i * 140}>
              <div className="card h-full px-5 py-6 text-left transition-transform duration-500 hover:-translate-y-1">
                <h3 className="flex items-center gap-2.5 font-display text-2xl leading-none text-blood-2 uppercase">
                  <Sparkle className="text-bone" size={16} delay={i * 0.9} />
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-bone">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The night: open bar and two stages */}
      <section id="a-noite" className="relative mx-auto max-w-3xl px-4 py-20 text-center">
        <Reveal>
          <SparkleHeading as="h2">A noite</SparkleHeading>
          <p className="section-title mt-5">
            Open bar.
            <br />
            {event.stages.length} palcos.
          </p>
          <Divider mark="sparkle" className="mx-auto mt-7 max-w-xs" />
        </Reveal>

        <Reveal className="mt-12">
          <div className="card relative overflow-hidden px-5 py-8">
            <p className="font-display text-5xl leading-none text-bone uppercase">Open bar</p>
            <p className="mt-3 text-base text-bone-2">Bebida liberada. O que vai ter no balcão ainda está no escuro.</p>
            <a href="#bebidas" className="btn-ghost mt-6 w-full sm:w-auto">
              Ver bebidas
            </a>
          </div>
        </Reveal>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {event.stages.map((stage, i) => (
            <Reveal key={stage.name} delay={i * 180}>
              <div className="card h-full px-5 py-7 text-left">
                <p className="flex items-center gap-2 font-display text-lg leading-none text-blood-2 uppercase">
                  <Sparkle className="text-bone" size={14} delay={i * 1.1} />
                  {stage.name}
                </p>
                <p className="mt-3 font-display text-4xl leading-[0.95] text-bone uppercase">{stage.sound}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* When and where */}
      <section className="relative px-4 py-10">
        <Reveal>
          <dl className="mx-auto grid max-w-4xl gap-8 border-y border-blood/40 py-9 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-blood/50">
            <Detail label="Quando" value={event.date} sub={event.time} />
            <Detail label="Onde" value={where && keepNumber(where)} href={mapsHref} />
            <Detail label="Entrada" value={brl(event.price)} />
          </dl>
          {event.venue && event.address && <p className="mt-6 text-center text-base text-bone-2">{event.address}</p>}
        </Reveal>
      </section>

      {/* Referral */}
      <section id="indique" className="relative mx-auto max-w-3xl px-4 py-20 text-center">
        <Reveal>
          <SparkleHeading as="h2">Indique e ganhe</SparkleHeading>
          <p className="section-title mt-5">
            {event.referralGoal} morcegos.
            <br />
            Sua entrada de graça.
          </p>
        </Reveal>
        <Reveal className="mt-10">
          <BatMeter count={0} goal={event.referralGoal} demo />
        </Reveal>
        <Reveal className="mt-10">
          <p className="mx-auto max-w-md text-lg leading-relaxed text-bone">
            Pegue seu link e mande para os amigos. Cada um que entrar por ele, com o Pix confirmado, vira um morcego no seu placar. Chegou a{" "}
            {event.referralGoal}, sua entrada sai de graça; se você já pagou, a gente devolve.
          </p>
          <BloodLink href="/indique" className="mt-8 w-full sm:w-auto">
            Quero meu link
          </BloodLink>
        </Reveal>
      </section>

      {/* Steps */}
      <section className="relative mx-auto max-w-5xl px-4 py-24 text-center">
        <Eyes className="right-5 bottom-36 sm:right-[8%] sm:bottom-24" size={16} blink={4.2} delay={0.6} />
        <Reveal>
          <SparkleHeading as="h2">Passo a passo</SparkleHeading>
          <p className="section-title mt-5">Três passos</p>
        </Reveal>
        <ol className="mt-12 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.numeral} delay={i * 160}>
              <li className="card group relative flex h-full flex-col items-center px-6 pt-8 pb-7">
                <span className="font-display text-6xl leading-none text-blood transition-transform duration-500 group-hover:scale-110">
                  {step.numeral}
                </span>
                <h3 className="mt-4 font-display text-2xl leading-tight text-bone uppercase">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-bone-2">{step.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-14 flex flex-col items-center gap-8">
          <BloodLink href="/garantir" className="w-full sm:w-auto">
            Garanta sua entrada
          </BloodLink>
        </Reveal>
      </section>

      <footer className="relative px-4 pt-6 pb-12 text-center">
        <Divider className="mx-auto mb-10 max-w-md" />
        <Eyes className="bottom-10 left-6 sm:left-[12%]" size={12} blink={7} delay={2} />
        <Logo size="md" className="mx-auto" />
        {event.contact && (
          <p className="mt-4 text-base text-bone-2">
            Dúvidas?{" "}
            <a href={event.contact.href} target="_blank" rel="noreferrer" className="text-bone underline decoration-blood/60 underline-offset-4">
              {event.contact.label}
            </a>
          </p>
        )}
        <p className="mt-3 text-sm text-bone-3 italic">Feito no escuro.</p>
      </footer>
    </main>
  );
}
