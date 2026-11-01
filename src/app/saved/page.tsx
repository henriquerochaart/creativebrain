import { ReferenceGrid } from "@/components/reference-grid";
import { listReferences, toPublic } from "@/server/references";
import { dict } from "@/server/lang";

export default async function SavedPage() {
  const { lang, d } = await dict();
  const rows = await listReferences({ saved: true, limit: 200 });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="large-title">{d.saved.title}</h1>
      </header>
      <ReferenceGrid references={rows.map(toPublic)} lang={lang} empty={d.saved.empty} />
    </div>
  );
}
