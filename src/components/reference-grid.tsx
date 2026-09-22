import type { PublicReference } from "@/server/references";
import { ReferenceCard } from "./reference-card";
import { t, type Lang } from "@/lib/i18n";

export function ReferenceGrid({ references, empty, showStatus, kindsById, lang = "pt" }: { references: PublicReference[]; empty?: React.ReactNode; showStatus?: boolean; kindsById?: Record<string, string[]>; lang?: Lang }) {
  if (!references.length)
    return <div className="rounded-2xl border border-dashed border-line p-12 text-center text-sm text-ink-3">{empty ?? t(lang).grid.nothing}</div>;
  return (
    <div className="masonry">
      {references.map((r) => (
        <ReferenceCard key={r.id} reference={r} showStatus={showStatus} kinds={kindsById?.[r.id]} lang={lang} />
      ))}
    </div>
  );
}
