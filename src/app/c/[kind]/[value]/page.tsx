import { notFound } from "next/navigation";
import { browse } from "@/server/search";
import { toPublic } from "@/server/references";
import { ReferenceGrid } from "@/components/reference-grid";
import { platformLabel } from "@/lib/utils";

const KINDS = ["platform", "subject", "format", "principle", "tag", "brand"] as const;
type Kind = (typeof KINDS)[number];

export default async function CategoryPage({ params }: { params: Promise<{ kind: string; value: string }> }) {
  const { kind, value: raw } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  const value = decodeURIComponent(raw);
  const refs = await browse({ [kind === "principle" ? "principle" : kind]: value }, 200);
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{kind}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{kind === "tag" ? `#${value}` : kind === "platform" ? platformLabel(value) : value}</h1>
        <p className="mt-1 text-sm text-ink-2">{refs.length} reference{refs.length === 1 ? "" : "s"}</p>
      </header>
      <ReferenceGrid references={refs.map(toPublic)} />
    </div>
  );
}
