"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { REFERRAL_COOKIE, REFERRAL_DAYS, REFERRAL_PARAM } from "@/lib/referral";
import { BloodLink } from "../blood-button";
import { Pumpkin } from "../pumpkin";
import { Sparkle } from "../sparkle";
import { BarOverlay, type BarDrink } from "./bar-overlay";
import { Loader } from "./loader";
import { useSoundtrack } from "./soundtrack";
// Imported directly rather than through <Logo>, which reads config/event.ts: that file holds the
// unrevealed drink names and must not end up in the browser bundle.
import logo from "../../../public/logo.png";

export interface SiteInfo {
  name: string;
  date: string | null;
  time: string | null;
  address: string | null;
  mapsHref: string | null;
  price: string;
  openBar: boolean;
  stages: { name: string; sound: string; note: string | null }[];
  referralGoal: number;
  contact: { label: string; href: string } | null;
}

/** The header (logo, sound, menu), the menu, the hidden bar and invite-link capture, on every public page. */
export function SiteChrome({ info, drinks }: { info: SiteInfo; drinks: BarDrink[] }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <Chrome info={info} drinks={drinks} />;
}

function Chrome({ info, drinks }: { info: SiteInfo; drinks: BarDrink[] }) {
  const sound = useSoundtrack();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Clear over the poster at the top; a black bar once the page moves under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ?i=<code> on any page: remember who invited this guest until they send their receipt.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get(REFERRAL_PARAM);
    if (code && /^[a-z]{1,10}-[a-z2-9]{4}$/.test(code)) {
      document.cookie = `${REFERRAL_COOKIE}=${code}; path=/; max-age=${REFERRAL_DAYS * 86400}; samesite=lax`;
    }
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", close);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", close);
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <Loader name={info.name} />
      <header
        className={`fixed inset-x-0 top-0 z-[70] flex h-16 items-center justify-between px-3 transition-colors duration-500 ${
          scrolled || menuOpen ? "border-b border-rule bg-black/90 backdrop-blur-sm" : "border-b border-transparent"
        }`}
      >
        <Link href="/" aria-label={`${info.name}, início`} className="flex h-11 items-center">
          <Image src={logo} alt={info.name} sizes="120px" priority className="h-10 w-auto" />
        </Link>
        <div className="flex gap-2">
        <button
          type="button"
          data-sound-toggle
          onClick={sound.toggle}
          aria-pressed={sound.state === "on"}
          aria-label={sound.state === "on" ? "Desligar a trilha" : "Ligar a trilha"}
          className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-rule bg-black/80 text-bone backdrop-blur-sm"
        >
          <SoundIcon state={sound.state} />
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? "Fechar o menu" : "Abrir o menu"}
          className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-rule bg-black/80 text-bone backdrop-blur-sm"
        >
          <span className={`burger ${menuOpen ? "is-open" : ""}`} aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
        </div>
      </header>

      {menuOpen && <Menu info={info} onClose={() => setMenuOpen(false)} />}
      <BarOverlay drinks={drinks} />
    </>
  );
}

function SoundIcon({ state }: { state: "off" | "loading" | "on" }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
      {state === "on" ? (
        <g className="sound-waves">
          <path d="M15.5 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3" />
          <path d="M18 6.5c1.8 1.4 2.8 3.3 2.8 5.5s-1 4.1-2.8 5.5" />
        </g>
      ) : state === "loading" ? (
        <path d="M16 12h.01M18.5 12h.01M21 12h.01" strokeWidth={2.4} />
      ) : (
        <path d="m16 9.5 5 5m0-5-5 5" />
      )}
    </svg>
  );
}

function Menu({ info, onClose }: { info: SiteInfo; onClose: () => void }) {
  let step = 0;
  const next = () => ({ animationDelay: `${120 + 90 * step++}ms` });
  return (
    <div id="site-menu" role="dialog" aria-modal="true" aria-label="Menu" className="menu-sheet fixed inset-0 z-[65] overflow-y-auto">
      <nav className="mx-auto flex min-h-full max-w-xl flex-col px-5 pt-20 pb-12">
        <ul className="space-y-7">
          <li className="menu-item" style={next()}>
            <p className="eyebrow text-bone-3">Quando</p>
            <p className="font-display text-4xl leading-none text-bone uppercase">{info.date ?? "Em breve"}</p>
            {info.time && <p className="mt-1 font-display text-3xl leading-none text-blood uppercase">{info.time}</p>}
          </li>
          <li className="menu-item" style={next()}>
            <p className="eyebrow text-bone-3">Onde</p>
            <p className="font-display text-3xl leading-tight text-bone uppercase">{info.address ?? "Em breve"}</p>
            {info.mapsHref && (
              <a href={info.mapsHref} target="_blank" rel="noreferrer" className="mt-1 inline-block text-base text-bone-2 underline decoration-blood underline-offset-4">
                Abrir no mapa
              </a>
            )}
          </li>
          {info.openBar && (
            <li className="menu-item" style={next()}>
              <p className="eyebrow text-bone-3">Bebida</p>
              <p className="font-display text-4xl leading-none text-bone uppercase">Open bar</p>
              <a href="#bebidas" onClick={onClose} className="mt-2 inline-block text-base text-bone-2 underline decoration-blood underline-offset-4">
                Ver bebidas
              </a>
            </li>
          )}
          <li className="menu-item" style={next()}>
            <p className="eyebrow text-bone-3">{info.stages.length} palcos</p>
            <ul className="mt-1 space-y-2">
              {info.stages.map((stage) => (
                <li key={stage.name} className="flex items-baseline gap-3">
                  <Sparkle className="text-blood" size={14} still />
                  <span className="font-display text-2xl leading-tight text-bone uppercase">
                    {stage.name} <span className="text-blood">·</span> {stage.sound}
                  </span>
                </li>
              ))}
            </ul>
          </li>
          <li className="menu-item" style={next()}>
            <p className="font-display text-3xl leading-none text-blood uppercase">Concurso de fantasia</p>
          </li>
          <li className="menu-item" style={next()}>
            <Link href="/indique" onClick={onClose} className="group block">
              <p className="eyebrow text-bone-3">Indique</p>
              <p className="font-display text-3xl leading-tight text-bone uppercase group-hover:text-blood">
                {info.referralGoal} morcegos, sua entrada sai de graça
              </p>
            </Link>
          </li>
          {info.contact && (
            <li className="menu-item" style={next()}>
              <p className="eyebrow text-bone-3">Dúvidas</p>
              <a href={info.contact.href} target="_blank" rel="noreferrer" className="font-display text-2xl text-bone uppercase underline decoration-blood underline-offset-4">
                {info.contact.label}
              </a>
            </li>
          )}
        </ul>
        <div className="menu-item mt-10" style={next()}>
          <BloodLink href="/garantir" className="w-full">
            Garanta sua entrada
          </BloodLink>
          <p className="mt-3 text-center text-base text-bone-2">{info.price} via Pix</p>
        </div>
        <div className="menu-item mt-10 flex items-center gap-3" style={next()} aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blood/80" />
          <Pumpkin size={28} />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blood/80" />
        </div>
      </nav>
    </div>
  );
}
