import type { PublicReference } from "@/server/references";
import { ReferenceCard } from "./reference-card";
import { Mascot, type MascotPose } from "./mascot";
import { t, type Lang } from "@/lib/i18n";

/** Masonry of references. Empty, it shows Brain in the pose that fits the page, over one short line. */
export function ReferenceGrid({
  references,
  empty,
  mascot = "dormindo",
  showStatus,
  kindsById,
  lang = "pt",
}: {
  references: PublicReference[];
  empty?: React.ReactNode;
  mascot?: MascotPose;
  showStatus?: boolean;
  kindsById?: Record<string, string[]>;
  lang?: Lang;
}) {
  if (!references.length)
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <Mascot pose={mascot} className="h-32 w-32" />
        <p className="max-w-sm text-[15px] leading-5 text-ink-2">{empty ?? t(lang).grid.nothing}</p>
      </div>
    );
  return (
    <div className="masonry">
      {references.map((r) => (
        <ReferenceCard key={r.id} reference={r} showStatus={showStatus} kinds={kindsById?.[r.id]} lang={lang} />
      ))}
    </div>
  );
}
