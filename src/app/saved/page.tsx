import { ReferenceGrid } from "@/components/reference-grid";
import { listReferences, toPublic } from "@/server/references";
import { dict } from "@/server/lang";

export default async function SavedPage() {
  const { lang, d } = await dict();
  const rows = await listReferences({ saved: true, limit: 200 });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{d.saved.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{d.saved.sub}</p>
      </header>
      <ReferenceGrid references={rows.map(toPublic)} lang={lang} empty={d.saved.empty} />
    </div>
  );
}
