import { Pumpkin } from "./pumpkin";
import { Sparkle } from "./sparkle";

/** The poster's thin red rule, fading at both ends, with a pumpkin or a sparkle in the middle. */
export function Divider({ mark = "pumpkin", className }: { mark?: "pumpkin" | "sparkle"; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blood/80" />
      {mark === "pumpkin" ? <Pumpkin size={30} /> : <Sparkle className="text-blood" size={22} />}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blood/80" />
    </div>
  );
}
