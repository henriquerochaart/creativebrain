import { ReferenceGrid } from "@/components/reference-grid";
import { listReferences, toPublic } from "@/server/references";

export default async function SavedPage() {
  const rows = await listReferences({ saved: true, limit: 200 });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Saved</h1>
        <p className="mt-1 text-sm text-ink-2">References you starred. Everything else is still remembered.</p>
      </header>
      <ReferenceGrid references={rows.map(toPublic)} empty="Star a reference on its page to keep it here." />
    </div>
  );
}
