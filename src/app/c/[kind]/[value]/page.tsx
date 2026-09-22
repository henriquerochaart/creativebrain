import { notFound } from "next/navigation";
import { browse } from "@/server/search";
import { toPublic } from "@/server/references";
import { ReferenceGrid } from "@/components/reference-grid";
import { dict } from "@/server/lang";
import { platformLabel, taxonomyLabel } from "@/lib/i18n";

const KINDS = ["platform", "subject", "format", "principle", "tag", "brand"] as const;
type Kind = (typeof KINDS)[number];

const TAXONOMY_OF: Partial<Record<Kind, "subjects" | "formats" | "principles">> = { subject: "subjects", format: "formats", principle: "principles" };

export default async function CategoryPage({ params }: { params: Promise<{ kind: string; value: string }> }) {
  const { lang, d } = await dict();
  const { kind: rawKind, value: raw } = await params;
  if (!KINDS.includes(rawKind as Kind)) notFound();
  const kind = rawKind as Kind;
  const value = decodeURIComponent(raw);
  const refs = await browse({ [kind]: value }, 200);
  const taxonomy = TAXONOMY_OF[kind];
  const heading = kind === "tag" ? `#${value}` : kind === "platform" ? platformLabel(lang, value) : taxonomy ? taxonomyLabel(lang, taxonomy, value) : value;
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{d.category[kind]}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-1 text-sm text-ink-2">{d.category.references(refs.length)}</p>
      </header>
      <ReferenceGrid references={refs.map(toPublic)} lang={lang} />
    </div>
  );
}
