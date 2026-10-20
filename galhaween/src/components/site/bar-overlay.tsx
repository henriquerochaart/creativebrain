"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BloodLink } from "../blood-button";

/** A drink as the bar shows it: only its shape until the organizers reveal the menu. */
export interface BarDrink {
  shape: "vodka" | "gin" | "can-slim" | "can";
  /** Present only once config/event.ts sets bar.revealed. */
  name?: string;
}

type Shape = BarDrink["shape"] | "mystery";

/** Silhouettes drawn to read as each drink's container, bottom-aligned on a 60×170 box. */
function Bottle({ shape }: { shape: Shape }) {
  switch (shape) {
    case "vodka":
      return (
        <svg viewBox="0 0 60 170" className="bottle-svg" aria-hidden>
          <path d="M24 4h12v28c0 7 16 9 16 22v106a10 10 0 0 1-10 10H18a10 10 0 0 1-10-10V54c0-13 16-15 16-22z" fill="rgb(214 232 255 / 0.28)" stroke="rgb(214 232 255 / 0.65)" />
          <rect x="22" y="2" width="16" height="12" rx="2" fill="#c9ced6" />
          <rect x="14" y="78" width="32" height="5" fill="#2f5fd0" />
          <rect x="16" y="90" width="28" height="3" fill="#2f5fd0" opacity="0.8" />
          <rect x="18" y="98" width="24" height="3" fill="#2f5fd0" opacity="0.6" />
          <path d="M14 60v90" stroke="rgb(255 255 255 / 0.55)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "gin":
      return (
        <svg viewBox="0 0 60 170" className="bottle-svg" aria-hidden>
          <path d="M22 4h16v16c0 4 6 6 10 10l4 6v124a10 10 0 0 1-10 10H18a10 10 0 0 1-10-10V36l4-6c4-4 10-6 10-10z" fill="#0f6a40" stroke="#3fae78" />
          <rect x="21" y="2" width="18" height="10" rx="2" fill="#1b1b1b" />
          <path d="M8 60h44M8 70h44M8 140h44" stroke="#3fae78" opacity="0.5" />
          <circle cx="30" cy="102" r="8" fill="#c8102e" />
          <path d="M13 44v104" stroke="rgb(255 255 255 / 0.4)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "can-slim":
      return (
        <svg viewBox="0 0 60 170" className="bottle-svg" aria-hidden>
          <rect x="18" y="46" width="24" height="124" rx="5" fill="#c9ced6" />
          <path d="M18 46h12v124H23a5 5 0 0 1-5-5z" fill="#1d3a8a" />
          <path d="M30 58l12 12M30 82l12 12M30 106l12 12M18 70l12-12M18 94l12-12M18 118l12-12" stroke="#1d3a8a" strokeWidth="3" opacity="0.6" />
          <circle cx="30" cy="112" r="7" fill="#f6c700" />
          <path d="M20 112h6m8 0h6" stroke="#d1121b" strokeWidth="4" strokeLinecap="round" />
          <rect x="20" y="44" width="20" height="4" rx="2" fill="#9aa0a8" />
        </svg>
      );
    case "can":
      return (
        <svg viewBox="0 0 60 170" className="bottle-svg" aria-hidden>
          <rect x="13" y="74" width="34" height="96" rx="6" fill="#1f5a2c" />
          <rect x="13" y="104" width="34" height="16" fill="#e4c21a" />
          <rect x="15" y="72" width="30" height="4" rx="2" fill="#9aa0a8" />
          <path d="M18 82v80" stroke="rgb(255 255 255 / 0.35)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 60 170" className="bottle-svg" aria-hidden>
          <path d="M26 4h8v40c0 8 14 14 14 30v86a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10V74c0-16 14-22 14-30z" fill="rgb(255 255 255 / 0.1)" stroke="rgb(255 255 255 / 0.35)" />
        </svg>
      );
  }
}

/**
 * "Ver bebidas": a dim bar behind a red neon sign, every bottle out of focus until the menu is
 * revealed. Opens on #bebidas, so the landing page, the menu and any shared link can point at it.
 */
export function BarOverlay({ drinks }: { drinks: BarDrink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Client-side navigation does not fire hashchange, so re-check on every route change too.
  useEffect(() => {
    const sync = () => setOpen(window.location.hash === "#bebidas");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  function close() {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpen(false);
  }

  if (!open) return null;

  const revealed = drinks.some((d) => d.name);
  const bottles: Shape[] = [];
  const cans: Shape[] = [];
  for (const drink of drinks) (drink.shape.startsWith("can") ? cans : bottles).push(drink.shape);
  // Fill the shelves the way a bar does: each bottle more than once, unknowns in between.
  const top: Shape[] = [bottles[0], "mystery", bottles[1] ?? "mystery", bottles[0], "mystery"].filter(Boolean) as Shape[];
  const bottom: Shape[] = [cans[0], cans[1] ?? cans[0], "mystery", cans[0], cans[1] ?? cans[0]].filter(Boolean) as Shape[];

  return (
    <div role="dialog" aria-modal="true" aria-label="Open bar" className="bar-scene fixed inset-0 z-[80] flex flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-16 pb-8">
        <div className="text-center">
          <p className="neon-sign font-display text-[3.6rem] leading-none uppercase sm:text-7xl">Open bar</p>
          <p className="neon-sub mt-3 font-display text-lg uppercase">{revealed ? "O cardápio da noite" : "Drinks revelados em breve"}</p>
        </div>

        <div className="mt-10 space-y-8">
          {[top, bottom].map((shelf, row) => (
            <div key={row} className="shelf">
              <div className="flex items-end justify-around gap-1 px-1">
                {shelf.map((shape, i) => {
                  const drink = drinks.find((d) => d.shape === shape);
                  const named = shape !== "mystery" && drink?.name;
                  return (
                    <div
                      key={i}
                      className={`bottle ${named ? "is-revealed" : ""}`}
                      style={{ animationDelay: `${300 + (row * 5 + i) * 110}ms` }}
                    >
                      <Bottle shape={shape} />
                      {shape === "mystery" && <span className="bottle-mark font-display">?</span>}
                      {named && <span className="mt-1 block text-center text-xs text-bone-2">{drink?.name}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="shelf-board" />
            </div>
          ))}
        </div>

        <div className="bar-counter mt-10" aria-hidden />

        <p className="mt-6 text-center text-base text-bone-2">
          {revealed ? "Tudo isso no open bar." : "Os rótulos ainda estão no escuro. Eles aparecem mais perto da festa."}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <BloodLink href="/garantir" className="w-full">
            Garanta sua entrada
          </BloodLink>
          <button type="button" onClick={close} className="btn-ghost w-full">
            Voltar para a festa
          </button>
        </div>
      </div>
    </div>
  );
}
