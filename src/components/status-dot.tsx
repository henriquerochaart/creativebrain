import { cn } from "@/lib/utils";
import { t, type Lang } from "@/lib/i18n";

export function StatusDot({ status, step, className, lang = "pt" }: { status: string; step?: string | null; className?: string; lang?: Lang }) {
  const d = t(lang);
  if (status === "understood")
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-ink-2", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {d.status.understood}
      </span>
    );
  if (status === "failed")
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-red-600", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {d.status.failed}
      </span>
    );
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-ink-2", className)}>
      <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-accent" /> {status === "queued" ? d.status.queued : d.status.processing(step)}
    </span>
  );
}
