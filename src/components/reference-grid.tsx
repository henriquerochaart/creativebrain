import type { PublicReference } from "@/server/references";
import { ReferenceCard } from "./reference-card";

export function ReferenceGrid({ references, empty, showStatus, kindsById }: { references: PublicReference[]; empty?: React.ReactNode; showStatus?: boolean; kindsById?: Record<string, string[]> }) {
  if (!references.length)
    return <div className="rounded-2xl border border-dashed border-line p-12 text-center text-sm text-ink-3">{empty ?? "Nothing here yet."}</div>;
  return (
    <div className="masonry">
      {references.map((r) => (
        <ReferenceCard key={r.id} reference={r} showStatus={showStatus} kinds={kindsById?.[r.id]} />
      ))}
    </div>
  );
}
