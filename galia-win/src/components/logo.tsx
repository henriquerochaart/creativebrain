import { event } from "@/config/event";

/**
 * Wordmark stand-in until the real logo is cut from the party video; swap the inside of this
 * component for that image and every page follows.
 */
export function Logo({ size = "hero" }: { size?: "hero" | "sm" }) {
  if (size === "sm") {
    return (
      <span className="inline-flex items-baseline gap-1.5 font-display text-lg tracking-[0.22em] text-bone">
        GALIA<span className="font-serif text-xl tracking-normal text-blood-2 italic">win</span>
      </span>
    );
  }
  return (
    <h1 className="relative inline-flex flex-col items-center leading-none" aria-label={event.name}>
      <span className="font-display text-[clamp(3.6rem,16vw,8.5rem)] font-semibold tracking-[0.14em] text-bone [text-shadow:0_4px_30px_rgb(0_0_0/0.8)]">
        GALIA
      </span>
      <span className="flicker -mt-[0.18em] self-end pr-[0.2em] font-serif text-[clamp(3rem,13vw,7rem)] text-blood-2 italic">
        win
      </span>
    </h1>
  );
}
