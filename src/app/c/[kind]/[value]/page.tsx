import { notFound } from "next/navigation";
import { browse } from "@/server/search";
import { toPublic } from "@/server/references";
import { ReferenceGrid } from "@/components/reference-grid";
import { dict } from "@/server/lang";
import { platformLabel, taxonomyLabel } from "@/lib/i18n";
import { PLATFORM_EMOJI, SUBJECT_EMOJI, TYPE_EMOJI } from "@/lib/emoji";
import { Emoji } from "@/components/emoji";

const KINDS = ["platform", "subject", "format", "principle", "tag", "brand", "type"] as const;
type Kind = (typeof KINDS)[number];

const TAXONOMY_OF: Partial<Record<Kind, "subjects" | "formats" | "principles">> = { subject: "subjects", format: "formats", principle: "principles" };

export default async function CategoryPage({ params }: { params: Promise<{ kind: string; value: string }> }) {
  const { lang, d } = await dict();
  const { kind: rawKind, value: raw } = await params;
  if (!KINDS.includes(rawKind as Kind)) notFound();
  const kind = rawKind as Kind;
  const value = decodeURIComponent(raw);
  // "type" is the media type (video, image, pdf…), which the browse filter calls mediaType.
  const refs = await browse(kind === "type" ? { mediaType: value } : { [kind]: value }, 200);
  const taxonomy = TAXONOMY_OF[kind];
  const heading =
    kind === "tag" ? `#${value}` : kind === "platform" ? platformLabel(lang, value) : kind === "type" ? (d.home.kinds[value] ?? value) : taxonomy ? taxonomyLabel(lang, taxonomy, value) : value;
  const emoji = kind === "type" ? TYPE_EMOJI[value] : kind === "platform" ? PLATFORM_EMOJI[value] : kind === "subject" ? SUBJECT_EMOJI[value] : undefined;
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{d.category[kind]}</p>
        <h1 className="large-title mt-1">
          {emoji ? <Emoji char={emoji} className="mr-2" /> : null}
          {heading}
        </h1>
        <p className="mt-1 text-sm text-ink-2">{d.category.references(refs.length)}</p>
      </header>
      <ReferenceGrid references={refs.map(toPublic)} lang={lang} />
    </div>
  );
}
