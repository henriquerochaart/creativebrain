import { cn } from "@/lib/utils";
import { Mascot } from "./mascot";

/** Brain thinking, breathing (scale + fade), reused wherever we tell someone understanding is under way. Sized in em unless the caller sets h/w. */
export function BrainThink({ className }: { className?: string }) {
  return (
    <span className={cn("brain-think inline-grid h-[1.3em] w-[1.3em] place-items-center leading-none", className)} aria-hidden>
      <Mascot pose="pensando" className="h-full w-full" />
    </span>
  );
}
