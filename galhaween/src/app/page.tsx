import Image from "next/image";
import { BloodLink } from "@/components/blood-button";
import { BatMeter } from "@/components/referral/bat-meter";
import { Divider } from "@/components/divider";
import { Eyes } from "@/components/eyes";
import { Logo } from "@/components/logo";
import { NightSky } from "@/components/night-sky";
import { PosterVideo } from "@/components/poster-video";
import { Reveal } from "@/components/reveal";
import { appear, depth, Scene } from "@/components/scene";
import { SceneDriver } from "@/components/scene-driver";
import { Sparkle, SparkleHeading } from "@/components/sparkle";
import { Spider } from "@/components/spider";
import { Tile } from "@/components/tile";
import { images } from "@/config/images";
import { event } from "@/config/event";
import { brl, keepNumber } from "@/lib/format";
import logo from "../../public/logo.png";

const STEPS = [
  { numeral: "I", title: `Faça um Pix de ${brl(event.price)}`, text: "Pela chave ou pelo QR Code, no app do seu banco." },
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
            <a href={href} target="_blank" rel="noreferrer" className="underline decoration-blood/60 underline-offset-4 hover:decoration-blood">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-bone-3 italic">em breve</span>
        )}
        {/* As on the poster: the time in red under the date. */}
        {value && sub && <span className="block text-blood">{sub}</span>}
      </dd>
    </div>
  );
}

export default function Home() {
  const where = event.venue ?? event.address;
  const mapsHref = event.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}` : undefined;

  /*
   * Phones: one column, each block fading up as it scrolls in (Reveal).
   * Desktop: every section is a pinned scene (Scene + SceneDriver). The screen holds still while
   * the scroll moves things into place; lg:col/row classes lay the same blocks out in two columns.
   */
  return (
    <main className="overflow-x-clip">
      <SceneDriver />

      {/* Hero: the poster, alive */}
      <Scene
        id="hero"
        len={1.6}
        innerClassName="flex flex-col items-center px-0 pt-6 pb-10 text-center sm:min-h-[100svh] sm:justify-center sm:px-4 lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:px-10 lg:py-0 lg:text-left"
      >
        <NightSky />
        <div
          className="hero-poster relative w-full max-w-[34rem] lg:mx-auto lg:w-[min(46vw,calc(86vh*1.036))] lg:max-w-none"
          style={{ aspectRatio: `${POSTER.width} / ${stageHeight}` }}
        >
          <PosterVideo
            className="absolute left-0 w-full"
            style={{ top: pct(VIDEO_BOX.top - POSTER.top, stageHeight), height: pct(VIDEO_BOX.height, stageHeight) }}
          />
          <h1
            className="absolute"
            style={{ left: pct(LOGO_BOX.left, POSTER.width), top: pct(LOGO_BOX.top - POSTER.top, stageHeight), width: pct(LOGO_BOX.width, POSTER.width) }}
          >
            <Image src={logo} alt={event.name} priority sizes="(max-width: 544px) 95vw, (max-width: 1024px) 520px, 46vw" className="h-auto w-full" />
          </h1>
        </div>

        <div className="hero-info relative z-10 w-full max-w-[34rem] px-4 lg:max-w-md lg:px-0">
          <dl className="grid grid-cols-[auto_1fr_auto] items-start border-t border-blood/40 pt-4 font-display text-[0.9rem] leading-[1.1] tracking-[0.01em] text-bone uppercase min-[360px]:text-[1.04rem] min-[380px]:text-[1.16rem] sm:text-[1.6rem] lg:text-[1.3rem] xl:text-[1.55rem]">
            <div className="pr-2.5 text-left whitespace-nowrap">
              <dt className="sr-only">Data</dt>
              <dd>{event.dateShort ?? "Em breve"}</dd>
              {event.time && <dd className="text-blood">{event.time}</dd>}
            </div>
            <div className="border-x border-blood/50 px-2.5 text-center">
              <dt className="sr-only">Endereço</dt>
              <dd>
                {mapsHref ? (
                  <a href={mapsHref} target="_blank" rel="noreferrer" className="hover:text-blood">
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
          <SparkleHeading className="mt-5 lg:mt-8 lg:justify-start lg:text-3xl">Concurso de fantasia</SparkleHeading>
          <Divider className="mt-3" />
          <div className="mt-7 flex flex-col items-center gap-3 lg:items-stretch">
            <BloodLink href="/garantir" className="w-full sm:w-auto lg:w-full">
              Garanta sua entrada
            </BloodLink>
            <p className="mt-2 text-base text-bone-2 lg:text-center">
              {brl(event.price)} <span className="text-bone-3">·</span> confirmação por e-mail
            </p>
          </div>
        </div>
        <a
          href="#a-festa"
          className="scene-hint eyebrow relative z-10 mt-12 flex flex-col items-center gap-2 text-bone-3 hover:text-bone-2 lg:absolute lg:bottom-6 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2"
        >
          Desça, se tiver coragem
          <span className="block h-6 w-px animate-pulse bg-gradient-to-b from-blood to-transparent" />
        </a>
      </Scene>

      {/* About */}
      <Scene
        id="a-festa"
        len={2.4}
        innerClassName="mx-auto max-w-3xl px-4 py-24 text-center lg:grid lg:max-w-6xl lg:grid-cols-2 lg:content-center lg:gap-x-14 lg:gap-y-8 lg:px-10 lg:py-0 lg:text-left"
      >
        <Spider className="right-4 sm:right-[6%]" thread={56} />
        <Eyes className="top-10 left-5 sm:left-[6%]" size={13} blink={6} delay={1.5} />
        <Reveal className="appear lg:col-start-1 lg:row-start-1" style={appear(-0.32, 0.26)}>
          <SparkleHeading as="h2" className="lg:justify-start">
            A festa
          </SparkleHeading>
          <p className="section-title mt-5">
            Venha como quiser.
            <br />
            Saia como puder.
          </p>
          <Divider mark="sparkle" className="mx-auto mt-7 max-w-xs lg:mx-0" />
        </Reveal>
        <Reveal className="appear mt-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-end" style={appear(-0.12, 0.24, 80)}>
          <div className="parallax" style={depth(140)}>
            <Tile name="olhar" className="aspect-[16/9]" drift sizes="(max-width: 768px) 100vw, 560px" />
          </div>
        </Reveal>
        <div className="mt-9 space-y-5 text-lg leading-relaxed text-bone lg:col-start-1 lg:row-start-2 lg:mt-0">
          {event.about.map((paragraph, i) => (
            <Reveal key={i} delay={i * 120} className="appear" style={appear(0.2 + i * 0.1)}>
              <p>{paragraph}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 lg:col-start-2 lg:row-start-3 lg:mt-0">
          <Reveal className="appear" style={appear(0.34, 0.18, 120)}>
            <div className="parallax" style={depth(220)}>
              <Tile name="caveira" className="aspect-square" drift sizes="(max-width: 768px) 50vw, 280px" />
            </div>
          </Reveal>
          <Reveal delay={180} className="appear" style={appear(0.42, 0.18, 120)}>
            <div className="parallax" style={depth(90)}>
              <Tile name="olho" className="aspect-square" drift sizes="(max-width: 768px) 50vw, 280px" />
            </div>
          </Reveal>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:col-start-1 lg:row-start-3 lg:mt-0 lg:grid-cols-1 lg:gap-2">
          {event.highlights.map((item, i) => (
            <Reveal key={item.title} delay={i * 140} className="appear" style={appear(0.55 + i * 0.08, 0.15, 40, -40)}>
              <div className="card h-full px-5 py-6 text-left transition-transform duration-500 hover:-translate-y-1 lg:px-5 lg:py-4">
                <h3 className="flex items-center gap-2.5 font-display text-2xl leading-none text-blood uppercase">
                  <Sparkle className="text-bone" size={16} delay={i * 0.9} />
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-bone lg:mt-2">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Scene>

      {/* Open bar */}
      <Scene
        id="open-bar"
        len={1.9}
        innerClassName="mx-auto max-w-3xl px-4 py-20 text-center lg:grid lg:max-w-6xl lg:grid-cols-[0.8fr_1.2fr] lg:content-center lg:items-center lg:gap-x-16 lg:px-10 lg:py-0 lg:text-left"
      >
        <Reveal className="appear lg:col-start-2 lg:row-start-1 lg:self-end" style={appear(-0.3, 0.26)}>
          <SparkleHeading as="h2" className="lg:justify-start">
            Open bar
          </SparkleHeading>
          <p className="section-title mt-5">
            Bebida
            <br />
            liberada.
          </p>
          <Divider mark="sparkle" className="mx-auto mt-7 max-w-xs lg:mx-0" />
        </Reveal>
        <Reveal className="appear mt-10 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0" style={appear(-0.36, 0.3, 100)}>
          <div className="parallax" style={depth(180)}>
            <Tile name="absinto" className="mx-auto aspect-[4/5] max-w-xs lg:max-w-none" drift sizes="(max-width: 640px) 80vw, 420px" />
          </div>
        </Reveal>
        <Reveal className="appear mt-10 lg:col-start-2 lg:row-start-2 lg:mt-8 lg:self-start" style={appear(0.3, 0.18)}>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-bone lg:mx-0">
            O balcão ainda está no escuro: dá para espiar as garrafas, mas os rótulos só aparecem mais perto da festa.
          </p>
          <a href="#bebidas" className="btn-ghost mt-8 w-full sm:w-auto">
            Ver bebidas
          </a>
        </Reveal>
      </Scene>

      {/* Stages */}
      <Scene
        id="palcos"
        len={2.1}
        innerClassName="mx-auto max-w-3xl px-4 py-20 text-center lg:flex lg:max-w-6xl lg:flex-col lg:justify-center lg:px-10 lg:py-0"
      >
        <Reveal className="appear" style={appear(-0.32, 0.26)}>
          <SparkleHeading as="h2">A música</SparkleHeading>
          <p className="section-title mt-5">
            Do funk
            <br className="lg:hidden" /> ao darkwave.
          </p>
          <Divider mark="pumpkin" className="mx-auto mt-7 max-w-xs" />
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:gap-6">
          {event.stages.map((stage, i) => (
            <Reveal key={stage.name} delay={i * 200} className="appear" style={appear(0.18 + i * 0.2, 0.22, 40, i === 0 ? -160 : 160)}>
              <div className="card h-full overflow-hidden text-left">
                <div className="overflow-hidden border-b border-rule">
                  <div className="parallax" style={depth(i === 0 ? 60 : 110)}>
                    <Tile name={i === 0 ? "caprichos" : "catedral"} className="aspect-[4/3] border-0 lg:aspect-[16/8]" drift sizes="(max-width: 640px) 100vw, 560px" />
                  </div>
                </div>
                <div className="px-5 pt-6 pb-8">
                  <p className="flex items-center gap-3 font-display text-6xl leading-none text-bone uppercase">
                    <Sparkle className="text-blood" size={22} delay={i * 1.1} />
                    {stage.name}
                  </p>
                  <p className="mt-3 font-display text-2xl leading-tight text-bone-2 uppercase">{stage.sound}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Scene>

      {/* When and where */}
      <Scene len={1.3} innerClassName="px-4 py-10 lg:flex lg:flex-col lg:justify-center lg:py-0">
        <dl className="mx-auto grid w-full max-w-4xl gap-8 border-y border-blood/40 py-9 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-blood/50 lg:max-w-5xl lg:py-14">
          {[
            <Detail key="quando" label="Quando" value={event.date} sub={event.time} />,
            <Detail key="onde" label="Onde" value={where && keepNumber(where)} href={mapsHref} />,
            <Detail key="entrada" label="Entrada" value={brl(event.price)} />,
          ].map((detail, i) => (
            <Reveal key={i} delay={i * 120} className="appear" style={appear(-0.3 + i * 0.12, 0.24)}>
              {detail}
            </Reveal>
          ))}
        </dl>
        {event.venue && event.address && <p className="mt-6 text-center text-base text-bone-2">{event.address}</p>}
      </Scene>

      {/* Referral */}
      <Scene
        id="indique"
        len={2.3}
        innerClassName="mx-auto max-w-3xl px-4 py-20 text-center lg:grid lg:max-w-6xl lg:grid-cols-2 lg:content-center lg:items-center lg:gap-x-16 lg:gap-y-10 lg:px-10 lg:py-0 lg:text-left"
      >
        <Reveal className="appear lg:col-start-1 lg:row-start-1" style={appear(-0.32, 0.26)}>
          <SparkleHeading as="h2" className="lg:justify-start">
            Indique e ganhe
          </SparkleHeading>
          <p className="section-title mt-5">
            {event.referralGoal} morcegos.
            <br />
            Sua entrada de graça.
          </p>
        </Reveal>
        <Reveal className="appear mt-10 lg:col-start-1 lg:row-start-2 lg:mt-0" style={appear(-0.16, 0.24, 90)}>
          <div className="parallax" style={depth(160)}>
            <Tile name="morcego" className="aspect-[16/9]" drift sizes="(max-width: 768px) 100vw, 560px" />
          </div>
        </Reveal>
        <Reveal className="mt-10 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:self-end">
          <BatMeter count={0} goal={event.referralGoal} scroll size={44} />
        </Reveal>
        <Reveal className="appear mt-10 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:self-start" style={appear(0.72, 0.16)}>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-bone lg:mx-0">
            Pegue seu link e espalhe. Cada amigo que entrar por ele, com o Pix confirmado, acende um morcego no seu placar. No{" "}
            {event.referralGoal === 10 ? "décimo" : `${event.referralGoal}º`}, sua entrada sai de graça; se você já tiver pago, devolvemos o Pix.
          </p>
          <BloodLink href="/indique" className="mt-8 w-full sm:w-auto">
            Quero meu link
          </BloodLink>
        </Reveal>
      </Scene>

      {/* Collage band */}
      <Scene len={1.5} className="lg:-mt-px" innerClassName="lg:flex lg:items-center">
        <div aria-hidden className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 px-4 py-6 sm:gap-3 lg:max-w-6xl lg:gap-8 lg:px-10">
          {(["nosferatu", "vela", "gargula"] as const).map((name, i) => (
            <Reveal key={name} delay={i * 160} className="appear" style={appear(-0.3 + i * 0.12, 0.3, 140)}>
              <div className="parallax" style={depth([260, 80, 180][i])}>
                <Tile name={name} className="aspect-[4/5]" drift sizes="(max-width: 768px) 33vw, 360px" />
              </div>
            </Reveal>
          ))}
        </div>
      </Scene>

      {/* Steps */}
      <Scene len={1.9} innerClassName="mx-auto max-w-5xl px-4 py-24 text-center lg:flex lg:flex-col lg:justify-center lg:py-0">
        <Eyes className="right-5 bottom-36 sm:right-[8%] sm:bottom-24" size={16} blink={4.2} delay={0.6} />
        <Reveal className="appear" style={appear(-0.32, 0.26)}>
          <SparkleHeading as="h2">Passo a passo</SparkleHeading>
          <p className="section-title mt-5">Três passos</p>
        </Reveal>
        <ol className="mt-12 grid gap-3 md:grid-cols-3 lg:gap-6">
          {STEPS.map((step, i) => (
            <Reveal key={step.numeral} delay={i * 160} className="appear" style={appear(0.16 + i * 0.16, 0.18, 90)}>
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
        <Reveal className="appear mt-14 flex flex-col items-center gap-8" style={appear(0.7, 0.16)}>
          <BloodLink href="/garantir" className="w-full sm:w-auto">
            Garanta sua entrada
          </BloodLink>
        </Reveal>
      </Scene>

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
        <details className="mx-auto mt-8 max-w-xl text-left text-xs leading-relaxed text-bone-3">
          <summary className="cursor-pointer text-center">Créditos</summary>
          <p className="mt-3">
            Imagens: obras em domínio público, tratadas em retícula vermelha. {Object.values(images).map((image) => image.credit).join(". ")}.
          </p>
          <p className="mt-2">Trilha: composta para este site.</p>
        </details>
      </footer>
    </main>
  );
}
