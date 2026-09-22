import { cn } from "@/lib/utils";

/** The 🧠 breathing (scale + fade), reused wherever we tell someone understanding is under way. */
export function BrainThink({ className }: { className?: string }) {
  return (
    <span className={cn("brain-think leading-none", className)} aria-hidden>
      🧠
    </span>
  );
}
