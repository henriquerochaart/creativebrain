import { BloodLink } from "@/components/blood-button";
import { Eyes } from "@/components/eyes";
import { Logo } from "@/components/logo";
import { Moon, NightSky } from "@/components/night-sky";
import { Reveal } from "@/components/reveal";
import { Spider } from "@/components/spider";
import { event } from "@/config/event";
import { brl } from "@/lib/format";

const STEPS = [
  { numeral: "I", title: `Faça um Pix de ${brl(event.price)}`, text: "Pela chave ou pelo QR Code, do app do seu banco." },
  { numeral: "II", title: "Envie o comprovante", text: "Junto com seu nome e o e-mail onde quer receber a entrada." },
  { numeral: "III", title: "Receba sua entrada", text: "Conferimos o Pix e mandamos um QR Code para o seu e-mail." },
];

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
      {/* Hero */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pt-24 pb-28 text-center">
        <NightSky />
        <Spider className="right-[9%] hidden sm:flex" thread={150} />
        <div className="relative z-10 flex flex-col items-center">
          <p className="eyebrow relative z-10 mb-6">Uma noite de Halloween</p>
          <div className="relative isolate">
            <Moon className="top-1/2 left-1/2 -z-10 h-[min(74vw,25rem)] w-[min(74vw,25rem)] -translate-x-1/2 -translate-y-[54%]" />
            <Logo />
          </div>
          <p className="relative z-10 mt-8 max-w-md text-[1.45rem] leading-snug text-bone italic">{event.tagline}</p>
          {when && <p className="eyebrow mt-5 text-bone">{when}</p>}
          <div className="mt-10 flex flex-col items-center gap-4">
            <BloodLink href="/garantir">Garanta sua entrada</BloodLink>
            <p className="mt-3 text-base text-bone-2">
              {brl(event.price)} <span className="text-bone-3">·</span> via Pix
            </p>
          </div>
        </div>
        <a href="#a-festa" className="eyebrow absolute bottom-8 z-10 flex flex-col items-center gap-2 text-bone-3 hover:text-bone-2">
          Desça, se tiver coragem
          <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-blood to-transparent" />
        </a>
      </section>

      {/* About */}
      <section id="a-festa" className="relative mx-auto max-w-3xl px-4 py-24 text-center">
        <Eyes className="top-16 left-[6%] hidden md:flex" size={14} blink={6} delay={1.5} />
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
            <Detail label="Onde" value={where} href={mapsHref} />
            <Detail label="Entrada" value={brl(event.price)} />
          </dl>
          {event.venue && event.address && <p className="mt-6 text-center text-base text-bone-2">{event.address}</p>}
        </Reveal>
      </section>

      {/* Steps */}
      <section className="relative mx-auto max-w-5xl px-4 py-24 text-center">
        <Eyes className="right-[8%] bottom-24 hidden md:flex" size={18} blink={4.2} delay={0.6} />
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
        <Logo size="sm" />
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
