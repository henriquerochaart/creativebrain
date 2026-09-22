"use client";

import { PROCESSING_STEPS, type ProcessingStep } from "@/server/taxonomy";
import { useT } from "./lang-provider";

/**
 * Full-width progress while a reference is being understood: a brain that pulses like it is
 * thinking, and a bar that fills with the pipeline's own steps (detect → … → save) so the
 * number is real progress, not a guess. Unknown/missing step still shows motion, just no fraction.
 */
export function UnderstandingProgress({ step, className }: { step?: string | null; className?: string }) {
  const d = useT();
  const index = step ? PROCESSING_STEPS.indexOf(step as ProcessingStep) : -1;
  const pct = index >= 0 ? Math.round(((index + 1) / PROCESSING_STEPS.length) * 100) : null;
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span className="brain-think text-2xl leading-none" aria-hidden>
          🧠
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{step ? d.status.processing(step) : d.status.queued}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
            <div
              className={pct === null ? "brain-indeterminate h-full w-1/3 rounded-full bg-accent" : "h-full rounded-full bg-accent transition-[width] duration-700 ease-out"}
              style={pct === null ? undefined : { width: `${pct}%` }}
            />
          </div>
        </div>
        {pct !== null && <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{pct}%</span>}
      </div>
    </div>
  );
}
