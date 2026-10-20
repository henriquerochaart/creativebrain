import Image from "next/image";
import { BloodLink } from "@/components/blood-button";
import { Eyes } from "@/components/eyes";
import { Logo } from "@/components/logo";
import { NightSky } from "@/components/night-sky";
import { PosterVideo } from "@/components/poster-video";
import { Pumpkin } from "@/components/pumpkin";
import { Reveal } from "@/components/reveal";
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

function Detail({ label, value, href }: { label: string; value: string | null; href?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-2xl text-bone">
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
      </dd>
    </div>
  );
}

export default function Home() {
  const when = [event.date, event.time].filter(Boolean).join(" · ") || null;
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
          <dl className="grid grid-cols-[auto_1fr_auto] items-start border-t border-blood/40 pt-4 font-serif text-[0.8rem] leading-tight font-semibold tracking-[0.02em] text-bone uppercase min-[360px]:text-[0.9rem] min-[380px]:text-[0.98rem] sm:text-xl">
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
          <p className="mt-4 flex items-center justify-center gap-3 font-serif text-lg font-semibold tracking-[0.03em] text-blood-2 uppercase sm:text-xl">
            <span aria-hidden className="text-bone">✦</span>
            Concurso de fantasia
            <span aria-hidden className="text-bone">✦</span>
          </p>
          <div className="mt-2 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blood/70" />
            <Pumpkin size={30} />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blood/70" />
          </div>
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
          <p className="eyebrow">A festa</p>
          <h2 className="section-title mt-3">Venha como quiser.<br />Saia como puder.</h2>
          <div className="ornament mx-auto mt-6 w-fit">
            <span className="h-1.5 w-1.5 rotate-45 bg-blood" />
          </div>
        </Reveal>
        <div className="mt-10 space-y-5 text-[1.3rem] leading-relaxed text-bone">
          {event.about.map((paragraph, i) => (
            <Reveal key={i} delay={i * 120}>
              <p>{paragraph}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {event.highlights.map((item, i) => (
            <Reveal key={item.title} delay={i * 140}>
              <div className="card h-full px-6 py-7 text-left transition-transform duration-500 hover:-translate-y-1 hover:-rotate-1">
                <p className="font-display text-sm tracking-[0.2em] text-blood-2 uppercase">{item.title}</p>
                <p className="mt-3 text-lg leading-snug text-bone">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* When and where */}
      <section className="relative border-y border-line bg-crypt/60 px-4 py-16">
        <Reveal>
          <dl className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
            <Detail label="Quando" value={when} />
            <Detail label="Onde" value={where && keepNumber(where)} href={mapsHref} />
            <Detail label="Entrada" value={brl(event.price)} />
          </dl>
          {event.venue && event.address && <p className="mt-6 text-center text-base text-bone-2">{event.address}</p>}
        </Reveal>
      </section>

      {/* Steps */}
      <section className="relative mx-auto max-w-5xl px-4 py-24 text-center">
        <Eyes className="right-5 bottom-36 sm:right-[8%] sm:bottom-24" size={16} blink={4.2} delay={0.6} />
        <Reveal>
          <p className="eyebrow">Passo a passo</p>
          <h2 className="section-title mt-3">Três passos</h2>
        </Reveal>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.numeral} delay={i * 160}>
              <li className="card group relative flex h-full flex-col items-center px-6 pt-10 pb-8">
                <span className="font-display text-5xl text-blood transition-transform duration-500 group-hover:scale-110">
                  {step.numeral}
                </span>
                <h3 className="mt-5 font-display text-base tracking-[0.12em] text-bone uppercase">{step.title}</h3>
                <p className="mt-3 text-lg leading-snug text-bone-2">{step.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-16 flex justify-center">
          <BloodLink href="/garantir">Garanta sua entrada</BloodLink>
        </Reveal>
      </section>

      <footer className="relative border-t border-line px-4 pt-14 pb-12 text-center">
        <Eyes className="top-6 left-1/2 -translate-x-1/2" size={12} blink={7} delay={2} />
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
