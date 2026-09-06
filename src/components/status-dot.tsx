import { cn } from "@/lib/utils";

export function StatusDot({ status, step, className }: { status: string; step?: string | null; className?: string }) {
  if (status === "understood")
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-ink-2", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Understood
      </span>
    );
  if (status === "failed")
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-red-600", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Failed
      </span>
    );
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-ink-2", className)}>
      <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-accent" /> {status === "queued" ? "Queued…" : `Processing${step ? ` · ${step}` : ""}…`}
    </span>
  );
}
