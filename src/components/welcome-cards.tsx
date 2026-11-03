"use client";

import { useRef, useState, useTransition } from "react";
import { seenWelcome } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { useT } from "./lang-provider";
import { Mascot, type MascotPose } from "./mascot";

/** One pose per card: hello, "send me things", and the sunglasses of someone who sees connections. */
const POSES: MascotPose[] = ["feliz", "apontando", "oculos"];

/**
 * The welcome cards, after Albo: three cards to swipe, Brain on each, one line in his voice.
 * Titles only. Continue moves to the next card; on the last it becomes the way in: Create
 * account while sign-ups are open, with Sign in under it once accounts exist. Skip jumps to the last.
 */
export function WelcomeCards({ signup, accounts }: { signup: boolean; accounts: boolean }) {
  const d = useT();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [pending, start] = useTransition();
  const titles = d.auth.welcome;
  const last = index === titles.length - 1;
  const destination = signup ? "/register" : "/login";

  const go = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 24, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const width = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? el.clientWidth;
    setIndex(Math.max(0, Math.min(titles.length - 1, Math.round(el.scrollLeft / (width + 12)))));
  };
  const finish = () => start(() => seenWelcome(destination));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex justify-end px-4">
        <button type="button" onClick={() => go(titles.length - 1)} className={cn("h-11 px-2 text-[17px] text-accent-ink", last && "invisible")}>
          {d.auth.skip}
        </button>
      </div>

      <div ref={track} onScroll={onScroll} data-no-pull className="mt-2 flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {titles.map((title, i) => (
          <section key={i} aria-hidden={i !== index} className="flex w-[calc(100%-1.5rem)] shrink-0 snap-start flex-col justify-between rounded-[32px] bg-accent/25 p-7">
            <div className="grid flex-1 place-items-center">
              <Mascot pose={POSES[i]} className={cn("h-60 w-60 transition-transform duration-500", i === index ? "scale-100" : "scale-90")} />
            </div>
            <h2 className="text-[30px] font-bold leading-[36px] text-ink">{title}</h2>
          </section>
        ))}
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-hidden>
        {titles.map((_, i) => (
          <span key={i} className={cn("h-2 rounded-full transition-all duration-300", i === index ? "w-6 bg-accent-ink" : "w-2 bg-fill-2")} />
        ))}
      </div>

      <div className="mt-6 px-6">
        <button type="button" disabled={pending} onClick={() => (last ? finish() : go(index + 1))} className="btn-filled h-14 w-full text-[17px]">
          {last ? (signup ? d.auth.register : d.auth.login) : d.auth.next}
        </button>
        {/* The second way in, for someone who already has an account, only where it is a choice. */}
        <button type="button" disabled={pending} onClick={() => start(() => seenWelcome("/login"))} className={cn("mt-2 h-11 w-full text-[17px] text-accent-ink", !(last && signup && accounts) && "invisible")}>
          {d.auth.login}
        </button>
      </div>
    </div>
  );
}
